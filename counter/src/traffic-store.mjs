const save=`WITH accepted AS (
  INSERT INTO github_traffic_sync (id,observed_at,completed_at,repository_count,last_attempt_at,last_error)
  VALUES ('karmenloop',$1,$2,$3,CURRENT_TIMESTAMP,NULL)
  ON CONFLICT (id) DO UPDATE SET observed_at=EXCLUDED.observed_at,completed_at=EXCLUDED.completed_at,
    repository_count=EXCLUDED.repository_count,last_attempt_at=CURRENT_TIMESTAMP,last_error=NULL
  WHERE github_traffic_sync.observed_at IS NULL OR github_traffic_sync.observed_at < EXCLUDED.observed_at
  RETURNING id
), written AS (
  INSERT INTO github_repository_views (repository_id,day,count,observed_at)
  SELECT row.repository_id,row.day,row.count,$1::timestamptz
  FROM jsonb_to_recordset($4::jsonb) AS row(repository_id bigint,day date,count bigint) CROSS JOIN accepted
  ON CONFLICT (repository_id,day) DO UPDATE SET count=EXCLUDED.count,observed_at=EXCLUDED.observed_at
  RETURNING repository_id
) SELECT count(*)::text AS written FROM written`;
const read=`SELECT s.completed_at,s.repository_count,s.last_error,
  (SELECT COALESCE(sum(v.count),0)::text FROM github_repository_views v) AS count,
  (SELECT min(v.day)::text FROM github_repository_views v) AS history_from
  FROM github_traffic_sync s WHERE s.id='karmenloop'`;
export function createTrafficStore({query}){
  return {
    async save(snapshot){
      if(!Number.isSafeInteger(snapshot.repositoryCount)||snapshot.repositoryCount<1)throw Error('Invalid repository coverage');
      const rows=snapshot.days.map(row=>({repository_id:row.repositoryId,day:row.day,count:row.count}));
      await query(save,[snapshot.observedAt,snapshot.completedAt,snapshot.repositoryCount,JSON.stringify(rows)]);
    },
    async read(){
      const row=(await query(read,[]))[0];if(!row?.completed_at)return null;
      return {count:String(row.count),historyFrom:row.history_from,lastSyncedAt:new Date(row.completed_at).toISOString(),coveredRepositories:row.repository_count,lastError:row.last_error};
    },
    async recordFailure(){
      await query(`INSERT INTO github_traffic_sync (id,repository_count,last_attempt_at,last_error)
        VALUES ('karmenloop',0,CURRENT_TIMESTAMP,'unavailable') ON CONFLICT (id) DO UPDATE
        SET last_attempt_at=CURRENT_TIMESTAMP,last_error='unavailable'`,[]);
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
