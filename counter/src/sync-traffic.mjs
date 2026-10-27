export function createScheduledTraffic({collect,store,now=()=>new Date()}){
  return async(request,context)=>{
    if(context?.deploy?.context!=='production'||context?.deploy?.published!==true)return;
    const attemptedAt=now().toISOString();
    try{await store.save(await collect());}
    catch{try{await store.recordFailure(attemptedAt);}catch{}throw Error('Repository traffic synchronization unavailable');}
  };
}
