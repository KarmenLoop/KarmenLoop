const select='SELECT count::text AS count, started_at, updated_at FROM profile_counter WHERE id = $1';
const increment=`INSERT INTO profile_counter (id, count, started_at, updated_at)
VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET count = profile_counter.count + 1, updated_at = CURRENT_TIMESTAMP
RETURNING count::text AS count, started_at, updated_at`;
function aggregate(row){
  if(!row)return null;
  return {count:String(row.count),startedAt:new Date(row.started_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()};
}
export function createStore({query}){
  return {
    async read(){return aggregate((await query(select,['karmenloop']))[0]);},
    async increment(){
      const row=(await query(increment,['karmenloop']))[0];
      if(!row)throw Error('Counter update did not return a record');
      return aggregate(row);
    }
  };
}
