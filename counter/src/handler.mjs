import { parseOptions } from './options.mjs';
import { combineMetrics } from './traffic-store.mjs';
export const headers={
  'Cache-Control':'no-store, no-cache, max-age=0, must-revalidate',
  'CDN-Cache-Control':'no-store',
  'Netlify-CDN-Cache-Control':'no-store',
  'Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff'
};
const empty={count:'0',startedAt:null,updatedAt:null};
export function createHandler({store,render,trafficStore,production=false}){
  return async function handle(request){
    const url=new URL(request.url),head=request.method==='HEAD';
    const reply=(body,status=200,extra={})=>new Response(head?null:body,{status,headers:{...headers,...extra}});
    if(!['GET','HEAD'].includes(request.method))return reply('Use GET or HEAD.',405,{'Allow':'GET, HEAD'});
    if(!['/profile.gif','/github.gif','/preview.gif','/stats.json','/health'].includes(url.pathname))return reply('Not found.',404);
    let options;
    try{options=parseOptions(url);}catch{return reply('Unsupported image options.',400);}
    if(url.pathname==='/health')return reply('ok',200,{'Content-Type':'text/plain; charset=utf-8'});
    const isProductionImage=production&&['/profile.gif','/github.gif'].includes(url.pathname);
    try{
      const state=(!head&&isProductionImage?await store.increment():await store.read())||empty;
      const snapshot=trafficStore&&url.pathname!=='/profile.gif'?combineMetrics(state,await trafficStore.read()):state;
      if(url.pathname==='/stats.json')return reply(JSON.stringify({...snapshot,measurement:snapshot.measurement||'image requests',mode:production?'production':'preview'}),200,{'Content-Type':'application/json; charset=utf-8'});
      if(head)return reply(null,200,{'Content-Type':'image/gif','X-Counter-Mode':isProductionImage?'production':'preview'});
      const bytes=render({...snapshot,...options,recorded:Boolean(snapshot.sources),repoCount:snapshot.sources?.repositoryPageViews.count,profileCount:snapshot.sources?.profileImageRequests.count});
      return reply(bytes,200,{'Content-Type':'image/gif','Content-Disposition':'inline; filename="karmenloop-profile.gif"','X-Counter-Mode':isProductionImage?'production':'preview'});
    }catch{
      return reply('Counter temporarily unavailable. Please try again later.',503,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'30'});
    }
  };
}
