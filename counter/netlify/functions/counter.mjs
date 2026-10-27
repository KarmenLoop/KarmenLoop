import { getDatabase } from '@netlify/database';
import { createStore } from '../../src/store.mjs';
import { createHandler } from '../../src/handler.mjs';
import { renderCard } from '../../src/render.mjs';

const store=createStore({query:(text,params)=>getDatabase().sql.unsafe(text,params)});
const emptyPreview=Object.freeze({read:async()=>null});
export default (request,context)=>{
  const production=context?.deploy?.context==='production';
  return createHandler({store:production?store:emptyPreview,render:renderCard,production})(request);
};
export const config={path:['/profile.gif','/preview.gif','/stats.json','/health']};
