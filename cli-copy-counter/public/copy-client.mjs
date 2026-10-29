export const DOWNLOAD_URL='https://github.com/KarmenLoop/koder-cli/releases/latest';
export const COPY_API='https://karmenloop-cli-copies.netlify.app';
const prefix='koder-cli-copy-event:',uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function eventValid(value){return value&&uuidPattern.test(value.eventId)&&['github','website'].includes(value.source)&&Object.keys(value).sort().join(',')==='eventId,source';}
function validateState(value){if(!value||value.mode!=='production'||value.metric!=='koder-cli-download-link-copies'||typeof value.count!=='string'||!/^\d{1,40}$/.test(value.count))throw Error('Invalid copy statistics');return value;}
export function createCopyTracker({writeText,fetch:request=globalThis.fetch,storage,api=COPY_API,onData=()=>{},onStatus=()=>{},timeout=8000,uuid=()=>crypto.randomUUID()}={}){
 const pending=new Map();let flushing=null;
 function restore(){try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(prefix))continue;let event;try{event=JSON.parse(storage.getItem(key));}catch{continue;}if(eventValid(event)&&key===prefix+event.eventId)pending.set(event.eventId,event);}}catch{}}
 function remove(event){pending.delete(event.eventId);try{storage.removeItem(prefix+event.eventId);}catch{}}
 async function flush(){
  if(flushing)return flushing;
  flushing=(async()=>{restore();while(pending.size){const event=pending.values().next().value;
   try{const response=await request(api+'/copies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),keepalive:true,signal:AbortSignal.timeout(timeout),cache:'no-store'});if(!response.ok)throw Error('Copy recording unavailable');const data=validateState(await response.json());if(data.eventId!==event.eventId)throw Error('Copy receipt mismatch');remove(event);onData(data);onStatus({state:'recorded'});}
   catch{onStatus({state:'pending'});return false;}
  }return true;})().finally(()=>{flushing=null;});return flushing;
 }
 async function copy(source='website'){
  if(!['github','website'].includes(source))throw Error('Unsupported entry');
  try{await writeText(DOWNLOAD_URL);}catch{onStatus({state:'copy-failed'});return {copied:false};}
  const event={eventId:uuid(),source};if(!eventValid(event)){onStatus({state:'recording-failed'});return {copied:true};}
  pending.set(event.eventId,event);let durable=true;try{storage.setItem(prefix+event.eventId,JSON.stringify(event));}catch{durable=false;}
  onStatus({state:'copied',durable});void flush();return {copied:true,eventId:event.eventId};
 }
 async function read(){try{const response=await request(api+'/stats.json',{cache:'no-store',signal:AbortSignal.timeout(timeout)});if(!response.ok)throw Error('Statistics unavailable');const state=validateState(await response.json());onData(state);return state;}catch{onStatus({state:'unavailable'});return null;}}
 restore();return {copy,flush,read};
}
