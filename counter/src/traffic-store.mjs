import {trafficWindow} from './github-traffic.mjs';
const save=`WITH accepted AS (
  INSERT INTO github_traffic_sync (id,observed_at,completed_at,repository_count,last_attempt_at,last_error,repository_ids)
  VALUES ('karmenloop',$1,$2,$3,$1,NULL,ARRAY(SELECT value::bigint FROM jsonb_array_elements_text($5::jsonb)))
  ON CONFLICT (id) DO UPDATE SET observed_at=EXCLUDED.observed_at,completed_at=EXCLUDED.completed_at,
    repository_count=EXCLUDED.repository_count,last_attempt_at=EXCLUDED.last_attempt_at,last_error=NULL,
    repository_ids=EXCLUDED.repository_ids
  WHERE (github_traffic_sync.observed_at IS NULL OR github_traffic_sync.observed_at <= EXCLUDED.observed_at)
    AND github_traffic_sync.last_attempt_at <= EXCLUDED.last_attempt_at
    AND github_traffic_sync.repository_ids <@ EXCLUDED.repository_ids
  RETURNING id
), written AS (
  INSERT INTO github_repository_views (repository_id,day,count,observed_at)
  SELECT row.repository_id,row.day,row.count,$1::timestamptz
  FROM jsonb_to_recordset($4::jsonb) AS row(repository_id bigint,day date,count bigint) CROSS JOIN accepted
  ON CONFLICT (repository_id,day) DO UPDATE SET count=EXCLUDED.count,observed_at=EXCLUDED.observed_at
  RETURNING repository_id
) SELECT EXISTS(SELECT 1 FROM accepted) AS accepted,count(*)::text AS written FROM written`;
const read=`SELECT s.completed_at,s.repository_count,s.last_error,
  (SELECT COALESCE(sum(v.count),0)::text FROM github_repository_views v) AS count,
  (SELECT min(v.day)::text FROM github_repository_views v) AS history_from
  FROM github_traffic_sync s WHERE s.id='karmenloop'`;
export function createTrafficStore({query,expectedRepositoryIds}){
  return {
    async save(snapshot){
      const validIds=ids=>Array.isArray(ids)&&ids.length>0&&ids.every(id=>typeof id==='string'&&/^[1-9]\d{0,18}$/.test(id)&&BigInt(id)<=9223372036854775807n)&&new Set(ids).size===ids.length;
      if(!validIds(expectedRepositoryIds)||!validIds(snapshot.repositoryIds)||snapshot.repositoryCount!==snapshot.repositoryIds.length||!expectedRepositoryIds.every(id=>snapshot.repositoryIds.includes(id)))throw Error('Invalid repository coverage');
      const window=trafficWindow(snapshot.observedAt);
      if(snapshot.window?.from!==window.from||snapshot.window?.to!==window.to||!Number.isFinite(Date.parse(snapshot.completedAt))||Date.parse(snapshot.completedAt)<Date.parse(snapshot.observedAt))throw Error('Invalid traffic window');
      const rows=new Map(),oldest=new Date(Date.parse(window.from+'T00:00:00Z')-86400000).toISOString().slice(0,10);
      for(const row of snapshot.days){
        if(!snapshot.repositoryIds.includes(row.repositoryId)||!/^\d{4}-\d{2}-\d{2}$/.test(row.day)||new Date(row.day+'T00:00:00Z').toISOString().slice(0,10)!==row.day||row.day<oldest||row.day>window.to||!Number.isSafeInteger(row.count)||row.count<0)throw Error('Invalid traffic day');
        const key=row.repositoryId+':'+row.day;if(rows.has(key))throw Error('Duplicate traffic day');
        rows.set(key,{repository_id:row.repositoryId,day:row.day,count:row.count});
      }
      // The earliest partial day can age out of GitHub's rolling window. Only
      // reconcile missing days inside the following fourteen UTC calendar days.
      for(const id of snapshot.repositoryIds)for(let date=Date.parse(window.from+'T00:00:00Z');date<=Date.parse(window.to+'T00:00:00Z');date+=86400000){
        const day=new Date(date).toISOString().slice(0,10),key=id+':'+day;
        if(!rows.has(key))rows.set(key,{repository_id:id,day,count:0});
      }
      const result=(await query(save,[snapshot.observedAt,snapshot.completedAt,snapshot.repositoryCount,JSON.stringify([...rows.values()]),JSON.stringify(snapshot.repositoryIds)]))[0];
      if(!result?.accepted)throw Error('Repository traffic snapshot rejected');
    },
    async read(){
      const row=(await query(read,[]))[0];if(!row?.completed_at)return null;
      return {count:String(row.count),historyFrom:row.history_from,lastSyncedAt:new Date(row.completed_at).toISOString(),coveredRepositories:row.repository_count,lastError:row.last_error};
    },
    async recordFailure(attemptedAt){
      if(!Number.isFinite(Date.parse(attemptedAt)))throw Error('Invalid attempt time');
      await query(`INSERT INTO github_traffic_sync (id,repository_count,last_attempt_at,last_error)
        VALUES ('karmenloop',0,$1,'unavailable') ON CONFLICT (id) DO UPDATE
        SET last_attempt_at=EXCLUDED.last_attempt_at,last_error='unavailable'
        WHERE github_traffic_sync.last_attempt_at <= EXCLUDED.last_attempt_at`,[attemptedAt]);
    }
  };
}
export function combineMetrics(profile,traffic,{now=new Date()}={}){
  const legacy=profile||{count:'0',startedAt:null,updatedAt:null};
  const repo=traffic?{...traffic,status:traffic.lastError||now-new Date(traffic.lastSyncedAt)>3*60*60*1000?'stale':'current'}:
    {count:null,historyFrom:null,lastSyncedAt:null,coveredRepositories:null,status:'pending'};
  const dates=[legacy.startedAt,repo.historyFrom&&repo.historyFrom+'T00:00:00.000Z'].filter(Boolean);
  const updates=[legacy.updatedAt,repo.lastSyncedAt].filter(Boolean);
  return {count:(BigInt(legacy.count)+BigInt(repo.count||'0')).toString(),startedAt:dates.length?dates.sort()[0]:null,
    updatedAt:updates.length?updates.sort().at(-1):null,measurement:'recorded views from overlapping sources',deduplicated:false,
    sources:{profileImageRequests:legacy,repositoryPageViews:repo}};
}
