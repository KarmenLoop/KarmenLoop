import {getDatabase} from '@netlify/database';
import {createCopyStore} from '../../src/store.mjs';
import {createCopyHandler} from '../../src/handler.mjs';
const store=createCopyStore({query:(text,params)=>getDatabase().sql.unsafe(text,params)});
export default (request,context)=>createCopyHandler({store,production:context?.deploy?.context==='production'&&context?.deploy?.published===true})(request);
export const config={path:['/copies','/stats.json','/badge.svg','/health']};
