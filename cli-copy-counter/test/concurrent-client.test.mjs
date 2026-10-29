import test from 'node:test';
import assert from 'node:assert/strict';
import {createCopyTracker} from '../public/copy-client.mjs';
import {randomUUID} from 'node:crypto';

test('a new copy made while recording is in flight is flushed without waiting for another timer',async()=>{
 let release,seen=0;
 const gate=new Promise(resolve=>{release=resolve;});
 const tracker=createCopyTracker({uuid:randomUUID,writeText:async()=>{},fetch:async(url,options)=>{
  const event=JSON.parse(options.body);seen++;if(seen===1)await gate;
  return new Response(JSON.stringify({count:String(seen),eventId:event.eventId,metric:'koder-cli-download-link-copies',mode:'production'}));
 }});
 await tracker.copy('website');await tracker.copy('website');release();await tracker.flush();assert.equal(seen,2);
});
