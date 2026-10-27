// Reading the current total never creates a view. Polls do not overlap.
export function createLiveReader({url='/stats.json',onData,onError,interval=10000,timeout=8000}){
  let active=false,timer,controller,generation=0;
  async function read(version){
    controller=new AbortController();const current=controller;
    const deadline=setTimeout(()=>current.abort(),timeout);
    try{
      const response=await fetch(url,{cache:'no-store',signal:current.signal});
      if(!response.ok)throw Error('Counter unavailable');
      const data=await response.json();
      if(typeof data.count!=='string'||!/^\d{1,40}$/.test(data.count))throw Error('Invalid counter response');
      if(active&&generation===version)onData(data);
    }catch(error){if(active&&generation===version)onError(error);}
    finally{clearTimeout(deadline);if(active&&generation===version)timer=setTimeout(()=>read(version),interval);}
  }
  return {
    start(){if(active)return;active=true;read(++generation);},
    stop(){active=false;generation++;clearTimeout(timer);controller?.abort();}
  };
}
