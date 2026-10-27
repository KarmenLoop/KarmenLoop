const API='https://api.github.com';
const OWNER='KarmenLoop';
function fail(code){throw new Error(`GitHub traffic: ${code}`);}
function whole(value){return Number.isSafeInteger(value)&&value>=0;}
export function trafficWindow(observedAt){
  const to=new Date(observedAt).toISOString().slice(0,10);
  return {from:new Date(Date.parse(to+'T00:00:00Z')-13*86400000).toISOString().slice(0,10),to};
}
export async function collectTraffic({token,baseURL=API,now=()=>new Date(),deadlineMs=23000,concurrency=6}={}){
  if(typeof token!=='string'||!token.trim())fail('credential missing');
  const base=new URL(baseURL);
  if(base.origin!==API&&!(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))fail('unsupported API origin');
  const observedAt=now().toISOString(),window=trafficWindow(observedAt),signal=AbortSignal.timeout(deadlineMs);
  async function get(path){
    let response;
    try{response=await fetch(new URL(path,base),{headers:{accept:'application/vnd.github+json',authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2026-03-10'},signal,redirect:'error'});}catch{fail(signal.aborted?'deadline exceeded':'request failed');}
    if(!response.ok)fail(`HTTP ${response.status}`);
    let json;try{json=await response.json();}catch{fail('invalid JSON');}
    return {json,link:response.headers.get('link')};
  }
  const repositories=[],ids=new Set();let page=1;
  for(;;){
    if(page>100)fail('inventory limit exceeded');
    const {json,link}=await get(`/user/repos?affiliation=owner&per_page=100&page=${page}`);
    if(!Array.isArray(json))fail('invalid inventory');
    for(const repo of json){
      if(repo.owner?.login?.toLowerCase()!==OWNER.toLowerCase())fail('foreign repository');
      if(!whole(repo.id)||repo.id===0||!/^[-.\w]+$/.test(repo.name||'')||ids.has(repo.id))fail('invalid or duplicate repository');
      ids.add(repo.id);repositories.push(repo);
    }
    const next=link?.split(',').map(s=>s.trim()).find(s=>/;\s*rel="next"/.test(s));
    if(!next)break;
    const match=next.match(/^<([^>]+)>/);if(!match)fail('invalid inventory pagination');
    const url=new URL(match[1]);
    if(url.origin!==base.origin||url.pathname!=='/user/repos'||Number(url.searchParams.get('page'))!==page+1)fail('invalid inventory pagination');
    page++;
  }
  if(!repositories.length)fail('empty inventory');
  const days=[];let cursor=0;
  await Promise.all(Array.from({length:Math.min(concurrency,repositories.length)},async()=>{
    for(;;){
      const index=cursor++;if(index>=repositories.length)return;
      const repo=repositories[index];
      const {json}=await get(`/repos/${OWNER}/${encodeURIComponent(repo.name)}/traffic/views?per=day`);
      if(!whole(json.count)||!Array.isArray(json.views))fail('invalid traffic');
      const dates=new Set();let sum=0;
      for(const row of json.views){
        const date=new Date(row.timestamp);
        if(typeof row.timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(row.timestamp)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==row.timestamp.slice(0,10)||date>new Date(observedAt)||dates.has(row.timestamp.slice(0,10))||!whole(row.count))fail('invalid traffic day');
        const day=row.timestamp.slice(0,10);dates.add(day);sum+=row.count;
        days.push({repositoryId:String(repo.id),day,count:row.count});
      }
      if(sum!==json.count)fail('incomplete traffic');
    }
  }));
  return {observedAt,completedAt:now().toISOString(),repositoryCount:repositories.length,repositoryIds:repositories.map(repo=>String(repo.id)),window,days};
}
