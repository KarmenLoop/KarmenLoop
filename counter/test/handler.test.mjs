import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createStore } from '../src/store.mjs';
import { createHandler } from '../src/handler.mjs';

const schema=await readFile(new URL('../netlify/database/migrations/202610270001_counter.sql',import.meta.url),'utf8');
async function database(path){
  const db=new PGlite(path);await db.exec(schema);
  return {db,store:createStore({query:async(sql,params)=>(await db.query(sql,params)).rows})};
}
const render=options=>Buffer.from(`GIF89a:${options.count}:${options.lang}:${options.theme}:${options.animated}`);
const request=path=>new Request(`https://counter.example${path}`);

test('atomic upserts retain every concurrent increment and survive reopening',async()=>{
  const path=await mkdtemp(join(tmpdir(),'karmen-counter-'));
  let db;
  try{
    const first=await database(path);db=first.db;
    assert.equal(await first.store.read(),null);
    const results=await Promise.all(Array.from({length:40},()=>first.store.increment()));
    assert.equal(new Set(results.map(r=>r.count)).size,40);
    const saved=await first.store.read();assert.equal(saved.count,'40');
    await db.close();db=null;
    const next=await database(path);db=next.db;
    assert.deepEqual(await next.store.read(),saved);
    assert.equal((await next.store.increment()).count,'41');
  }finally{if(db)await db.close();await rm(path,{recursive:true,force:true});}
});

test('languages share a count while stats, previews, HEAD, and health are read-only',async()=>{
  const {db,store}=await database();
  try{
    const handle=createHandler({store,render,production:true});
    const initial=await handle(request('/stats.json'));assert.equal((await initial.json()).count,'0');
    assert.equal((await handle(request('/preview.gif'))).status,200);
    assert.equal((await handle(new Request('https://counter.example/profile.gif',{method:'HEAD'}))).status,200);
    assert.equal((await handle(request('/health'))).status,200);assert.equal(await store.read(),null);
    const en=await handle(request('/profile.gif?lang=en&theme=light'));
    assert.match(await en.text(),/GIF89a:1:en:light:true/);
    assert.match(en.headers.get('cache-control'),/no-store/);
    const zh=await handle(request('/profile.gif?lang=zh-CN&theme=dark'));
    assert.match(await zh.text(),/GIF89a:2:zh-CN:dark:true/);
    const staticImage=await handle(request('/preview.gif?motion=static'));assert.match(await staticImage.text(),/:false$/);
    assert.equal((await store.read()).count,'2');
  }finally{await db.close();}
});

test('unsupported routes, methods, and parameters never mutate the count',async()=>{
  const {db,store}=await database();
  try{
    const handle=createHandler({store,render,production:true});
    for(const path of ['/reset','/profile.gif?lang=xx','/profile.gif?theme=blue','/profile.gif?key=other','/profile.gif?lang=en&lang=zh-CN','/stats.json?reset=1','/profile.gif?motion=spin','/profile.gif?constructor=x','/profile.gif?toString=x','/profile.gif?__proto__=x','/profile.gif?hasOwnProperty=x'])
      assert.ok((await handle(request(path))).status>=400,path);
    assert.equal((await handle(new Request('https://counter.example/profile.gif',{method:'POST'}))).status,405);
    assert.equal(await store.read(),null);
  }finally{await db.close();}
});

test('the edge guard answers HEAD before the origin can convert it to GET',async()=>{
  const {default:guard}=await import('../netlify/edge-functions/head.js');
  const response=await guard(new Request('https://counter.example/profile.gif?lang=en&theme=light',{method:'HEAD'}));
  assert.equal(response.status,200);assert.equal(await response.text(),'');
  assert.equal(response.headers.get('content-type'),'image/gif');
  assert.equal(response.headers.get('x-counter-mode'),'head');
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal(await guard(request('/profile.gif')),undefined,'GET must continue to the origin');
  const bad=await guard(new Request('https://counter.example/profile.gif?constructor=x',{method:'HEAD'}));
  assert.equal(bad.status,400);
});

test('a preview deployment never increments the production record',async()=>{
  const {db,store}=await database();
  try{
    const handle=createHandler({store,render,production:false});
    const response=await handle(request('/profile.gif'));
    assert.equal(response.status,200);assert.equal(response.headers.get('x-counter-mode'),'preview');
    assert.equal(await store.read(),null);
  }finally{await db.close();}
});

test('storage failure returns 503 without a fabricated zero or internal secrets',async()=>{
  const store={read:async()=>{throw Error('postgres://secret')},increment:async()=>{throw Error('postgres://secret')}};
  const handle=createHandler({store,render,production:true});
  for(const path of ['/profile.gif','/preview.gif','/stats.json']){
    const response=await handle(request(path));assert.equal(response.status,503);
    const body=await response.text();assert.doesNotMatch(body,/secret|GIF89a|\b0\b/);
  }
});
