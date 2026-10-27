import { getDatabase } from '@netlify/database';
import { createStore } from '../../src/store.mjs';
import { createHandler } from '../../src/handler.mjs';
import { renderCard } from '../../src/render.mjs';

const store=createStore({query:(text,params)=>getDatabase().sql.unsafe(text,params)});
export default (request,context)=>createHandler({store,render:renderCard,production:context?.deploy?.context==='production'})(request);
export const config={path:['/profile.gif','/preview.gif','/stats.json','/health']};
