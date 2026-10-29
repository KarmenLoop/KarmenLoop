import {createCopyTracker,DOWNLOAD_URL,COPY_API} from './copy-client.mjs';
const panel=document.querySelector('[data-cli-copy]');
if(panel){
 const zh=!document.documentElement.lang.startsWith('en'),button=panel.querySelector('[data-cli-copy-button]'),total=panel.querySelector('[data-cli-copy-total]'),feedback=panel.querySelector('[data-cli-copy-feedback]'),sync=panel.querySelector('[data-cli-copy-sync]');
 const text=zh?{copy:'[ 复制下载链接 ]',copied:'[ 已复制 ]',ok:'链接已复制。',saving:'正在记录本次复制…',saved:'统计已更新。',pending:'链接已复制，统计暂未保存；保持页面打开后会重试。',denied:'浏览器未能复制。可手动选择链接；手动复制不计入此统计。',unavailable:'统计暂时不可用，继续显示上次收到的数字。',memory:'链接已复制。请保持页面打开，等待本次统计保存。'}:{copy:'[ COPY DOWNLOAD LINK ]',copied:'[ COPIED ]',ok:'Link copied.',saving:'Recording this copy…',saved:'Count updated.',pending:'The link is copied. Recording is pending and will retry while this page stays open.',denied:'The browser could not copy the link. You can select it manually; manual copies are outside this count.',unavailable:'The count is unavailable. Showing the last value received.',memory:'Link copied. Keep this page open until the count is saved.'};
 let storage,lastCount=null,timer,buttonTimer,recordingPending=false;
 try{storage=globalThis.localStorage;}catch{}
 const source=new URL(location.href).searchParams.get('from')==='github'?'github':'website';
 const tracker=createCopyTracker({storage,api:panel.dataset.cliCopyApi||COPY_API,
  writeText:value=>{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');return navigator.clipboard.writeText(value);},
  onData:data=>{const count=BigInt(data.count);if(lastCount===null||count>=lastCount){lastCount=count;total.textContent=count.toLocaleString(zh?'zh-CN':'en-US');}if(!recordingPending)sync.textContent=text.saved;},
  onStatus:status=>{
   if(status.state==='copied'){recordingPending=true;feedback.textContent=text.ok;button.textContent=text.copied;sync.textContent=status.durable?text.saving:text.memory;clearTimeout(buttonTimer);buttonTimer=setTimeout(()=>{button.textContent=text.copy;},2200);}
   if(status.state==='recorded'){recordingPending=false;sync.textContent=text.saved;}
   if(status.state==='pending'){recordingPending=true;sync.textContent=text.pending;}
   if(status.state==='unavailable')sync.textContent=recordingPending?text.pending:text.unavailable;
   if(status.state==='recording-failed')sync.textContent=text.memory;
   if(status.state==='copy-failed'){feedback.textContent=text.denied;button.textContent=text.copy;}
  }
 });
 panel.querySelector('[data-cli-copy-url]').textContent=DOWNLOAD_URL;
 button.addEventListener('click',()=>{void tracker.copy(source);});
 function refresh(){if(!document.hidden){void tracker.flush();void tracker.read();}}
 function visibility(){clearInterval(timer);if(!document.hidden){refresh();timer=setInterval(refresh,10000);}}
 addEventListener('online',refresh);document.addEventListener('visibilitychange',visibility);addEventListener('pagehide',()=>{void tracker.flush();clearInterval(timer);});visibility();
 if(source==='github')for(const link of document.querySelectorAll('.lang-link')){const url=new URL(link.href);if(url.origin===location.origin){url.searchParams.set('from','github');link.href=url.href;}}
}
