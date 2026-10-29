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

test('saved feedback waits for every queued copy even when storage is unavailable',async()=>{
 let releaseFirst,releaseSecond,secondStarted,seen=0;
 const first=new Promise(resolve=>{releaseFirst=resolve;}),second=new Promise(resolve=>{releaseSecond=resolve;}),started=new Promise(resolve=>{secondStarted=resolve;}),statuses=[];
 const tracker=createCopyTracker({uuid:randomUUID,writeText:async()=>{},onStatus:status=>statuses.push(status.state),fetch:async(url,options)=>{
  const event=JSON.parse(options.body);seen++;
  if(seen===1)await first;else{secondStarted();await second;}
  return new Response(JSON.stringify({count:String(seen),eventId:event.eventId,metric:'koder-cli-download-link-copies',mode:'production'}));
 }});
 await tracker.copy();await tracker.copy();releaseFirst();await started;
 try{assert.equal(statuses.includes('recorded'),false,'The second copy has not been saved');}
 finally{releaseSecond();await tracker.flush();}
 assert.equal(statuses.at(-1),'recorded');assert.equal(statuses.filter(value=>value==='recorded').length,1);
});

test('restored work signals pending before a statistics read can replace its feedback',async()=>{
 const event={eventId:randomUUID(),source:'github'},key='koder-cli-copy-event:'+event.eventId,statuses=[];
 const storage={length:1,key:()=>key,getItem:()=>JSON.stringify(event),removeItem:()=>{}};
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const tracker=createCopyTracker({storage,onStatus:status=>statuses.push(status.state),fetch:async(url,options={})=>{
  if(options.method==='POST')await gate;
  return new Response(JSON.stringify({count:'1',...(options.method==='POST'?{eventId:event.eventId}:{}),metric:'koder-cli-download-link-copies',mode:'production'}));
 }});
 const flushing=tracker.flush();await tracker.read();
 try{assert.equal(statuses.at(-1),'pending');}
 finally{release();await flushing;}
 assert.equal(statuses.at(-1),'recorded');
});
