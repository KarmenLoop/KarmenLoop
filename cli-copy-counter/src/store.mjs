const aggregate=`SELECT count(*)::text AS count,
 count(*) FILTER (WHERE source='github')::text AS github,
 count(*) FILTER (WHERE source='website')::text AS website,
 min(recorded_at) AS started_at,max(recorded_at) AS updated_at FROM cli_download_copy_events`;
export function createCopyStore({query}){
 async function read(){
  const row=(await query(aggregate,[]))[0];if(!row)throw Error('Copy statistics unavailable');
  return {count:String(row.count),sources:{github:String(row.github),website:String(row.website)},startedAt:row.started_at?new Date(row.started_at).toISOString():null,updatedAt:row.updated_at?new Date(row.updated_at).toISOString():null};
 }
 return {read,async record({eventId,source}){
  await query('INSERT INTO cli_download_copy_events (event_id,source) VALUES ($1,$2) ON CONFLICT (event_id) DO NOTHING',[eventId,source]);
  const existing=(await query('SELECT source FROM cli_download_copy_events WHERE event_id=$1',[eventId]))[0];
  if(!existing||existing.source!==source){const error=Error('Copy event conflicts with an existing receipt');error.code='EVENT_CONFLICT';throw error;}
  return read();
 }};
}
