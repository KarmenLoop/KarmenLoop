import test from 'node:test';
import assert from 'node:assert/strict';
import {createScheduledTraffic} from '../src/sync-traffic.mjs';

test('scheduled collector runs only on the published production deploy',async()=>{
 let collections=0,saves=0;
 const handler=createScheduledTraffic({collect:async()=>{collections++;return {sample:true};},store:{save:async state=>{assert.equal(state.sample,true);saves++;},recordFailure:async()=>{throw Error('Unexpected failure');}}});
 for(const context of [undefined,{deploy:{context:'deploy-preview',published:true}},{deploy:{context:'production',published:false}}])await handler(null,context);
 assert.equal(collections,0);assert.equal(saves,0);
 await handler(null,{deploy:{context:'production',published:true}});assert.equal(collections,1);assert.equal(saves,1);
});

test('scheduled collection failure records status without saving a partial result or exposing details',async()=>{
 let failures=0;
 const handler=createScheduledTraffic({collect:async()=>{throw Error('credential-private-name');},store:{save:async()=>{throw Error('Should not save');},recordFailure:async()=>{failures++;}}});
 await assert.rejects(()=>handler(null,{deploy:{context:'production',published:true}}),error=>!error.message.includes('credential-private-name'));
 assert.equal(failures,1);
});
