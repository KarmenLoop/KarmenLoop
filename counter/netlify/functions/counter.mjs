import { getDatabase } from '@netlify/database';
import { createStore } from '../../src/store.mjs';
import { createHandler } from '../../src/handler.mjs';
import { renderCard } from '../../src/render.mjs';
import { createTrafficStore } from '../../src/traffic-store.mjs';

const store=createStore({query:(text,params)=>getDatabase().sql.unsafe(text,params)});
const trafficStore=createTrafficStore({query:(text,params)=>getDatabase().sql.unsafe(text,params)});
const emptyPreview=Object.freeze({read:async()=>null});
export default (request,context)=>{
  const production=context?.deploy?.context==='production';
  return createHandler({store:production?store:emptyPreview,render:renderCard,trafficStore:production?trafficStore:undefined,production})(request);
};
export const config={path:['/profile.gif','/github.gif','/preview.gif','/stats.json','/health']};
