import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createCopyStore} from '../src/store.mjs';
import {createCopyHandler} from '../src/handler.mjs';
import {createCopyTracker,DOWNLOAD_URL} from '../public/copy-client.mjs';
function storage(){const values=new Map();return {get length(){return values.size;},key:n=>[...values.keys()][n]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}};
async function service(){
 const db=new PGlite();await db.exec(await readFile(new URL('../netlify/database/migrations/202610290001_copies.sql',import.meta.url),'utf8'));const store=createCopyStore({query:async(sql,args)=>(await db.query(sql,args)).rows}),handle=createCopyHandler({store,production:true,origins:['https://kodermodule.com']});
 let drop=false;
 const server=createServer(async(req,res)=>{const body=[];for await(const chunk of req)body.push(chunk);const response=await handle(new Request('https://api.test'+req.url,{method:req.method,headers:req.headers,...(body.length?{body:Buffer.concat(body)}:{})}));if(drop&&req.method==='POST'){drop=false;return res.destroy();}res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {store,url:`http://127.0.0.1:${server.address().port}`,dropNext:()=>{drop=true;},fetch:(url,options={})=>fetch(url,{...options,headers:{...options.headers,origin:'https://kodermodule.com'}}),close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await db.close();}};
}

test('three successful clipboard writes produce three independent copies',async()=>{
 const api=await service(),copied=[],states=[],queue=storage();
 try{const tracker=createCopyTracker({api:api.url,fetch:api.fetch,storage:queue,writeText:async text=>copied.push(text),onData:state=>states.push(state)});
  for(let i=0;i<3;i++){assert.equal((await tracker.copy('website')).copied,true);await tracker.flush();}
  assert.deepEqual(copied,[DOWNLOAD_URL,DOWNLOAD_URL,DOWNLOAD_URL]);assert.equal((await api.store.read()).count,'3');assert.equal(states.at(-1).count,'3');assert.equal(queue.length,0);
 }finally{await api.close();}
});

test('clipboard denial records no copy',async()=>{
 const api=await service(),queue=storage();try{
  const tracker=createCopyTracker({api:api.url,fetch:api.fetch,storage:queue,writeText:async()=>{throw Error('NotAllowedError');}});
  assert.equal((await tracker.copy('github')).copied,false);await tracker.flush();assert.equal((await api.store.read()).count,'0');assert.equal(queue.length,0);
 }finally{await api.close();}
});

test('an ambiguous response retries the same event and does not count twice',async()=>{
 const api=await service(),queue=storage();try{
  api.dropNext();const tracker=createCopyTracker({api:api.url,fetch:api.fetch,storage:queue,writeText:async()=>{}});
  await tracker.copy('github');assert.equal(await tracker.flush(),false);assert.equal((await api.store.read()).count,'1');assert.equal(queue.length,1);
  const resumed=createCopyTracker({api:api.url,fetch:api.fetch,storage:queue,writeText:async()=>{}});assert.equal(await resumed.flush(),true);assert.equal((await api.store.read()).count,'1');assert.equal(queue.length,0);
 }finally{await api.close();}
});

test('two page instances retain separate pending actions in the shared queue',async()=>{
 const api=await service(),queue=storage();try{
  const offline=async()=>{throw Error('offline');};const first=createCopyTracker({api:api.url,fetch:offline,storage:queue,writeText:async()=>{}}),second=createCopyTracker({api:api.url,fetch:offline,storage:queue,writeText:async()=>{}});
  await Promise.all([first.copy('github'),second.copy('website')]);await Promise.all([first.flush(),second.flush()]);assert.equal(queue.length,2);
  const recovered=createCopyTracker({api:api.url,fetch:api.fetch,storage:queue,writeText:async()=>{}});await recovered.flush();const state=await api.store.read();assert.equal(state.count,'2');assert.deepEqual(state.sources,{github:'1',website:'1'});
 }finally{await api.close();}
});

test('read-only statistics never enqueue a copy and broken persistence does not block copying',async()=>{
 const api=await service();try{
  let writes=0;const tracker=createCopyTracker({api:api.url,fetch:api.fetch,storage:{get length(){throw Error('blocked');},setItem(){throw Error('blocked');}},writeText:async()=>{writes++;}});
  await tracker.read();await tracker.read();assert.equal((await api.store.read()).count,'0');assert.equal(writes,0);
  assert.equal((await tracker.copy('website')).copied,true);await tracker.flush();assert.equal(writes,1);assert.equal((await api.store.read()).count,'1');
 }finally{await api.close();}
});
