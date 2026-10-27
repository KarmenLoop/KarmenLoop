export function createScheduledTraffic({collect,store}){
  return async(request,context)=>{
    if(context?.deploy?.context!=='production'||context?.deploy?.published!==true)return;
    try{await store.save(await collect());}
    catch{try{await store.recordFailure();}catch{}throw Error('Repository traffic synchronization unavailable');}
  };
}
