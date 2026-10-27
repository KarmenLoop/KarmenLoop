import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {collectTraffic} from '../src/github-traffic.mjs';
import {createTrafficStore,combineMetrics} from '../src/traffic-store.mjs';
const stamp='2026-10-27T10:00:00.000Z';
const repos=[{id:1,name:'one',owner:{login:'KarmenLoop'}},{id:2,name:'two',owner:{login:'KarmenLoop'}}];
async function api(run){
 const server=createServer(run);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
function response(res,data,status=200,headers={}){res.writeHead(status,{'content-type':'application/json',...headers});res.end(JSON.stringify(data));}

test('collector follows inventory pages and reads every owned repository',async()=>{
 let base,requests=0;
 const server=await api((req,res)=>{
  assert.equal(req.headers.authorization,'Bearer local-test-only');requests++;
  const url=new URL(req.url,base);
  if(url.pathname==='/user/repos')return response(res,url.searchParams.get('page')==='2'?[repos[1]]:[repos[0]],200,url.searchParams.get('page')==='2'?{}:{link:`<${base}/user/repos?affiliation=owner&per_page=100&page=2>; rel="next"`});
  response(res,{count:3,uniques:2,views:[{timestamp:'2026-10-26T00:00:00Z',count:3,uniques:2}]});
 });base=server.url;
 try{const result=await collectTraffic({token:'local-test-only',baseURL:base,now:()=>new Date(stamp)});assert.equal(result.repositoryCount,2);assert.deepEqual(result.repositoryIds.sort(),['1','2']);assert.deepEqual(result.window,{from:'2026-10-14',to:'2026-10-27'});assert.equal(result.days.length,2);assert.equal(result.days.reduce((n,row)=>n+row.count,0),6);assert.equal(requests,4);assert.ok(result.days.every(row=>!('name' in row)));}finally{await server.close();}
});

test('failed, malformed, foreign, duplicate, or incomplete traffic never becomes a zero snapshot',async()=>{
 for(const kind of ['forbidden','mismatch','foreign','duplicate','negative','date','redirect']){
  const server=await api((req,res)=>{
   if(req.url.startsWith('/user/repos'))return response(res,kind==='foreign'?[{...repos[0],owner:{login:'other'}}]:kind==='duplicate'?[repos[0],repos[0]]:repos);
   if(kind==='forbidden')return response(res,{message:'private-name-secret'},403);
   if(kind==='redirect'){res.writeHead(302,{location:'https://example.com/credential-sink'});return res.end();}
   response(res,{count:kind==='mismatch'?9:3,views:[{timestamp:kind==='date'?'bad':'2026-10-26T00:00:00Z',count:kind==='negative'?-3:3}]});
  });
  try{await assert.rejects(()=>collectTraffic({token:'local-test-only',baseURL:server.url,now:()=>new Date(stamp)}),error=>!error.message.includes('private-name-secret'),kind);}finally{await server.close();}
 }
});

test('traffic collection has a deadline and requires a credential',async()=>{
 await assert.rejects(()=>collectTraffic({token:''}),/credential/i);
 const server=await api((req,res)=>{setTimeout(()=>response(res,[]),120);});
 try{await assert.rejects(()=>collectTraffic({token:'local-test-only',baseURL:server.url,deadlineMs:30}),/deadline|aborted|timeout/i);}finally{await server.close();}
});

async function database(){const db=new PGlite();await db.exec(await readFile(new URL('../netlify/database/migrations/202610270004_repository_traffic.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../netlify/database/migrations/202610270005_traffic_coverage.sql',import.meta.url),'utf8'));return {db,store:createTrafficStore({query:async(sql,params)=>(await db.query(sql,params)).rows,expectedRepositoryIds:['1','2']})};}
const snapshot=(observedAt,days,repositoryIds=['1','2'])=>({observedAt,completedAt:observedAt,repositoryCount:repositoryIds.length,repositoryIds,window:{from:'2026-10-14',to:'2026-10-27'},days});
const day=(repositoryId,date,count)=>({repositoryId,day:date,count});

test('daily upserts retain history, replace source corrections, and reject old overlapping imports',async()=>{
 const {db,store}=await database();
 try{
  assert.equal(await store.read(),null);
  const a=snapshot(stamp,[day('1','2026-10-13',10),day('2','2026-10-26',20)]);
  await store.save(a);await store.save(a);assert.equal((await store.read()).count,'30');
  const b=snapshot('2026-10-27T11:00:00Z',[day('2','2026-10-26',23),day('1','2026-10-27',2)]);
  await store.save(b);assert.equal((await store.read()).count,'35');
  await assert.rejects(()=>store.save(snapshot('2026-10-27T10:30:00Z',[day('2','2026-10-26',999)])),/rejected/i);assert.equal((await store.read()).count,'35');
  await store.save(snapshot('2026-10-27T12:00:00Z',[day('2','2026-10-26',21)]));assert.equal((await store.read()).count,'31');
  await store.recordFailure('2026-10-27T12:30:00Z');const state=await store.read();assert.equal(state.count,'31');assert.equal(state.coveredRepositories,2);assert.equal(state.lastError,'unavailable');
  await assert.rejects(()=>store.save(snapshot('2026-10-27T13:00:00Z',[day('2','2026-10-26',-1)])));assert.equal((await store.read()).count,'31');
 }finally{await db.close();}
});

test('combined count preserves the legacy aggregate and clearly identifies overlapping sources',()=>{
 const profile={count:'8',startedAt:'2026-10-27T08:01:49.028Z',updatedAt:stamp};
 const traffic={count:'537',historyFrom:'2026-10-13',lastSyncedAt:stamp,coveredRepositories:39,lastError:null};
 const state=combineMetrics(profile,traffic,{now:new Date(stamp)});
 assert.equal(state.count,'545');assert.equal(state.sources.profileImageRequests.count,'8');assert.equal(state.sources.profileImageRequests.startedAt,profile.startedAt);assert.equal(state.sources.repositoryPageViews.count,'537');assert.equal(state.sources.repositoryPageViews.status,'current');assert.equal(state.deduplicated,false);
 assert.equal(combineMetrics(profile,null).sources.repositoryPageViews.count,null);
 assert.equal(combineMetrics(profile,null).count,'8');
 assert.equal(combineMetrics(profile,traffic,{now:new Date('2026-10-28T10:00:00Z')}).sources.repositoryPageViews.status,'stale');
});

test('account images combine official history with retained requests; stats polling never adds a view',async()=>{
 const {createStore}=await import('../src/store.mjs');
 const {createHandler}=await import('../src/handler.mjs');
 const {db,store:trafficStore}=await database();
 try{
  await db.exec(await readFile(new URL('../netlify/database/migrations/202610270001_counter.sql',import.meta.url),'utf8'));
  const store=createStore({query:async(text,params)=>(await db.query(text,params)).rows});
  await db.query('INSERT INTO profile_counter VALUES ($1,$2,$3,$3)',['karmenloop',8,'2026-10-27T08:01:49.028Z']);
  await trafficStore.save(snapshot(stamp,[day('1','2026-10-26',537)]));
  const handle=createHandler({store,trafficStore,production:true,render:state=>Buffer.from(JSON.stringify(state))});
  const get=path=>handle(new Request('https://example.test'+path));
  for(let i=0;i<3;i++)assert.equal((await (await get('/stats.json')).json()).count,'545');
  assert.equal((await store.read()).count,'8');
  const image=await (await get('/github.gif')).json();assert.equal(image.count,'546');assert.equal(image.repoCount,'537');assert.equal(image.profileCount,'9');assert.equal(image.recorded,true);
  const legacy=await (await get('/profile.gif')).json();assert.equal(legacy.count,'10');assert.equal(legacy.recorded,false);
  assert.equal((await (await get('/stats.json')).json()).count,'547');assert.equal((await trafficStore.read()).count,'537');
 }finally{await db.close();}
});


test('coverage cannot shrink or swap a tracked repository even when the visible count stays the same',async()=>{
 const {db,store}=await database();
 try{
  await assert.rejects(()=>store.save(snapshot(stamp,[],['1','3'])),/coverage|rejected/i);
  await store.save(snapshot(stamp,[day('1','2026-10-26',10)],['1','2','3']));
  await assert.rejects(()=>store.save(snapshot('2026-10-27T11:00:00Z',[],['1','2','4'])),/coverage|rejected/i);
  assert.equal((await store.read()).count,'10');assert.equal((await store.read()).coveredRepositories,3);
  await store.save(snapshot('2026-10-27T12:00:00Z',[day('1','2026-10-26',11)],['1','2','3','4']));
  assert.equal((await store.read()).coveredRepositories,4);
 }finally{await db.close();}
});

test('empty source days clear the authoritative window while retaining the rolling boundary and older history',async()=>{
 const {db,store}=await database();
 try{
  await store.save(snapshot(stamp,[day('1','2026-10-13',7),day('1','2026-10-14',10),day('2','2026-10-26',20)]));
  await store.save(snapshot('2026-10-27T11:00:00Z',[]));
  assert.equal((await store.read()).count,'7');
  await store.save(snapshot('2026-10-27T12:00:00Z',[day('1','2026-10-13',5)]));
  assert.equal((await store.read()).count,'5');
  await assert.rejects(()=>store.save({...snapshot('2026-10-27T13:00:00Z',[]),window:{from:'2026-01-01',to:'2026-10-27'}}),/window/i);
  assert.equal((await store.read()).count,'5');
 }finally{await db.close();}
});

test('failure status follows attempt start order rather than callback completion order',async()=>{
 const {db,store}=await database();
 try{
  await store.save(snapshot(stamp,[day('1','2026-10-26',10)]));
  await store.recordFailure('2026-10-27T09:00:00Z');
  assert.equal((await store.read()).lastError,null);
  await store.recordFailure('2026-10-27T11:00:00Z');
  assert.equal((await store.read()).lastError,'unavailable');
  await assert.rejects(()=>store.save(snapshot('2026-10-27T10:30:00Z',[day('1','2026-10-26',99)])),/rejected/i);
  assert.equal((await store.read()).count,'10');
  await store.save(snapshot('2026-10-27T12:00:00Z',[day('1','2026-10-26',12)]));
  await store.recordFailure('2026-10-27T11:30:00Z');
  assert.equal((await store.read()).lastError,null);assert.equal((await store.read()).count,'12');
 }finally{await db.close();}
});
