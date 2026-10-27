import {getDatabase} from '@netlify/database';
import {collectTraffic} from '../../src/github-traffic.mjs';
import {createTrafficStore} from '../../src/traffic-store.mjs';
import {createScheduledTraffic} from '../../src/sync-traffic.mjs';
const store=createTrafficStore({query:(text,params)=>getDatabase().sql.unsafe(text,params)});
export default createScheduledTraffic({store,collect:()=>collectTraffic({token:process.env.GITHUB_TRAFFIC_TOKEN})});
export const config={schedule:'17 * * * *'};
