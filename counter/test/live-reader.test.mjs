import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createLiveReader} from '../public/live-reader.mjs';

test('an open live view receives genuine source changes without reloading or adding counts',async()=>{
 let count='545',requests=0;const seen=[];
 const server=createServer((req,res)=>{requests++;res.setHeader('content-type','application/json');res.end(JSON.stringify({count}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/stats.json`;
 let resolveDone,rejectDone;const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
 const reader=createLiveReader({url,interval:30,onData:data=>{seen.push(data.count);if(seen.length===1)count='548';if(seen.length===2)resolveDone();},onError:rejectDone});
 try{reader.start();reader.start();await done;reader.stop();assert.deepEqual(seen,['545','548']);assert.equal(count,'548');assert.equal(requests,2);}finally{reader.stop();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('an unavailable source reports an error and retains the previous observation',async()=>{
 let requests=0;const seen=[];
 const server=createServer((req,res)=>{requests++;res.setHeader('content-type','application/json');if(requests===1)return res.end('{"count":"20"}');res.writeHead(503);res.end('unavailable');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let resolveDone;const done=new Promise(resolve=>{resolveDone=resolve;});
 const reader=createLiveReader({url:`http://127.0.0.1:${server.address().port}`,interval:30,onData:data=>seen.push(data.count),onError:resolveDone});
 try{reader.start();await done;reader.stop();assert.deepEqual(seen,['20']);}finally{reader.stop();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
