import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createCopyStore} from '../src/store.mjs';
import {createCopyHandler} from '../src/handler.mjs';
const origin='https://kodermodule.com';
async function database(path){const db=new PGlite(path);await db.exec(await readFile(new URL('../netlify/database/migrations/202610290001_copies.sql',import.meta.url),'utf8'));return {db,store:createCopyStore({query:async(text,params)=>(await db.query(text,params)).rows})};}
function request(path,{method='GET',body,headers={}}={}){return new Request('https://copies.example'+path,{method,headers:{origin,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}

test('each new copy event counts once and retries do not count again',async()=>{
 const {db,store}=await database();try{
  assert.equal((await store.read()).count,'0');
  const event={eventId:randomUUID(),source:'github'};
  assert.equal((await store.record(event)).count,'1');assert.equal((await store.record(event)).count,'1');
  assert.equal((await store.record({eventId:randomUUID(),source:'website'})).count,'2');
  const state=await store.read();assert.deepEqual(state.sources,{github:'1',website:'1'});assert.ok(state.startedAt);assert.ok(state.updatedAt);
  await assert.rejects(()=>store.record({...event,source:'website'}),error=>error.code==='EVENT_CONFLICT');assert.equal((await store.read()).count,'2');
 }finally{await db.close();}
});

test('concurrent distinct actions and concurrent retries retain the exact total',async()=>{
 const {db,store}=await database();try{
  const events=Array.from({length:20},()=>({eventId:randomUUID(),source:'website'}));
  await Promise.all([...events,...events].map(event=>store.record(event)));
  assert.equal((await store.read()).count,'20');
 }finally{await db.close();}
});

test('copy history remains after reopening durable storage',async()=>{
 const path=await mkdtemp(join(tmpdir(),'koder-copies-'));let db;
 try{let value=await database(path);db=value.db;await value.store.record({eventId:randomUUID(),source:'github'});await db.close();db=new PGlite(path);const store=createCopyStore({query:async(sql,params)=>(await db.query(sql,params)).rows});assert.equal((await store.read()).count,'1');}finally{await db?.close();await rm(path,{recursive:true,force:true});}
});

test('statistics and badge requests are read-only; successful POST records one copy',async()=>{
 const {db,store}=await database();try{
  const handle=createCopyHandler({store,production:true,origins:[origin]});
  for(const path of ['/stats.json','/badge.svg','/health']){const response=await handle(request(path));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);}
  assert.equal((await store.read()).count,'0');
  const event={eventId:randomUUID(),source:'github'};let response=await handle(request('/copies',{method:'POST',body:event}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.count,'1');assert.equal(data.eventId,event.eventId);assert.equal(response.headers.get('access-control-allow-origin'),origin);
  assert.equal((await (await handle(request('/copies',{method:'POST',body:event}))).json()).count,'1');
  assert.equal((await handle(request('/stats.json',{method:'HEAD'}))).status,200);assert.equal((await store.read()).count,'1');
 }finally{await db.close();}
});

test('invalid origins, methods, payloads and oversized bodies cannot add copies',async()=>{
 const {db,store}=await database();try{
  const handle=createCopyHandler({store,production:true,origins:[origin]}),event={eventId:randomUUID(),source:'website'};
  for(const [path,options,status]of [
   ['/copies',{method:'POST',body:event,headers:{origin:'https://evil.example'}},403],
   ['/copies',{method:'POST',body:event,headers:{origin:'null'}},403],
   ['/copies',{method:'POST',body:'{'},400],
   ['/copies',{method:'POST',body:{...event,eventId:'bad'}},400],
   ['/copies',{method:'POST',body:{...event,source:'tui'}},400],
   ['/copies',{method:'POST',body:{...event,count:999}},400],
   ['/copies',{method:'POST',body:event,headers:{'Content-Type':'text/plain'}},415],
   ['/copies',{method:'POST',body:'x'.repeat(1025)},413],
   ['/stats.json',{method:'POST',body:event},405],
   ['/copies',{method:'GET'},405],
   ['/other',{method:'POST',body:event},404]
  ])assert.equal((await handle(request(path,options))).status,status,path+' '+JSON.stringify(options));
  assert.equal((await store.read()).count,'0');
  const preflight=await handle(request('/copies',{method:'OPTIONS',headers:{'access-control-request-method':'POST','access-control-request-headers':'content-type'}}));assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-methods'),/POST/);
 }finally{await db.close();}
});

test('preview deployments cannot access production storage or record events',async()=>{
 const handle=createCopyHandler({production:false,origins:[origin],store:{read:()=>{throw Error('Unexpected DB read');},record:()=>{throw Error('Unexpected DB write');}}});
 const state=await (await handle(request('/stats.json'))).json();assert.equal(state.mode,'preview');assert.equal(state.count,null);
 assert.equal((await handle(request('/copies',{method:'POST',body:{eventId:randomUUID(),source:'website'}}))).status,403);
});

test('storage failures return unavailable rather than fabricating zero',async()=>{
 const handle=createCopyHandler({production:true,origins:[origin],store:{read:async()=>{throw Error('private database details');},record:async()=>{throw Error('private database details');}}});
 const response=await handle(request('/stats.json'));assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private database/);
});
