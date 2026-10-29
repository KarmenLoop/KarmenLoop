export const origins=['https://kodermodule.com','https://www.kodermodule.com','https://karmenloop-cli-copies.netlify.app'];
const noCache={'Cache-Control':'no-store, max-age=0','CDN-Cache-Control':'no-store','Netlify-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function fault(status){const error=Error('Invalid copy request');error.status=status;throw error;}
async function eventFrom(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))fault(415);
 if(Number(request.headers.get('content-length'))>1024)fault(413);
 const reader=request.body?.getReader();if(!reader)fault(400);
 const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();fault(413);}chunks.push(value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(size);let cursor=0;for(const chunk of chunks){body.set(chunk,cursor);cursor+=chunk.length;}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}catch{fault(400);}
 if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='eventId,source'||typeof data.eventId!=='string'||!uuid.test(data.eventId)||!['github','website'].includes(data.source))fault(400);
 return data;
}
function badge(count,zh){
 const label=zh?'CLI 链接复制':'CLI link copies',value=count===null?'—':BigInt(count).toLocaleString('en-US');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="30" role="img" aria-label="${label}: ${value}"><title>${label}: ${value}</title><rect width="280" height="30" fill="#12141c"/><rect x=".5" y=".5" width="279" height="29" fill="none" stroke="#3a3a3a"/><text x="12" y="20" fill="#c5c2bc" font-family="monospace" font-size="12">${label}</text><text x="268" y="20" text-anchor="end" fill="#7ca6ff" font-family="monospace" font-size="14">${value}</text></svg>`;
}
export function createCopyHandler({store,production=false,origins:allowed=origins}){
 return async request=>{
  const url=new URL(request.url),path=url.pathname,origin=request.headers.get('origin'),head=request.method==='HEAD';
  const cors=allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{'Access-Control-Allow-Origin':'*'};
  const reply=(body,status=200,extra={})=>new Response(head?null:body,{status,headers:{...noCache,...cors,...extra}});
  if(!['/copies','/stats.json','/badge.svg','/health'].includes(path))return reply('Not found.',404);
  if(request.method==='OPTIONS'){
   if(path!=='/copies'||!allowed.includes(origin)||request.headers.get('access-control-request-method')!=='POST')return reply('Origin or method not allowed.',403);
   return reply(null,204,{'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
  }
  if(path==='/copies'){
   if(request.method!=='POST')return reply('Use POST.',405,{'Allow':'POST, OPTIONS'});
   if(!production||!allowed.includes(origin))return reply('Copy recording is not enabled for this origin.',403);
   try{const event=await eventFrom(request),state=await store.record(event);return reply(JSON.stringify({...state,eventId:event.eventId,metric:'koder-cli-download-link-copies',mode:'production'}),200,{'Content-Type':'application/json; charset=utf-8'});}
   catch(error){const status=error.code==='EVENT_CONFLICT'?409:error.status||503;return reply(status===503?'Copy recording temporarily unavailable.':'Invalid copy event.',status,{'Content-Type':'text/plain; charset=utf-8'});}
  }
  if(!['GET','HEAD'].includes(request.method))return reply('Use GET or HEAD.',405,{'Allow':'GET, HEAD'});
  if(path==='/health')return reply('ok',200,{'Content-Type':'text/plain; charset=utf-8'});
  if(url.searchParams.has('lang')&&!['en','zh-CN'].includes(url.searchParams.get('lang')))return reply('Unsupported language.',400);
  try{
   const state=production?await store.read():{count:null,sources:{github:null,website:null},startedAt:null,updatedAt:null};
   if(path==='/badge.svg')return reply(badge(state.count,url.searchParams.get('lang')==='zh-CN'),200,{'Content-Type':'image/svg+xml; charset=utf-8'});
   return reply(JSON.stringify({...state,metric:'koder-cli-download-link-copies',mode:production?'production':'preview'}),200,{'Content-Type':'application/json; charset=utf-8'});
  }catch{return reply('Copy statistics temporarily unavailable.',503,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'10'});}
 };
}
