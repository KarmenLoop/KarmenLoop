import {createLiveReader} from './live-reader.mjs';
const $=id=>document.getElementById(id),query=new URL(location.href).searchParams;
let zh=query.get('lang')==='zh-CN',light=query.has('theme')?query.get('theme')==='light':matchMedia('(prefers-color-scheme:light)').matches;
let paused=matchMedia('(prefers-reduced-motion:reduce)').matches,inView=true,latest=null,error=false;
const translations={
 en:{label:'Recorded GitHub views',repos:'Repository page views',profile:'Profile image requests',description:'This page updates automatically while it is open. Reading these totals does not add a view.',note:'The total combines GitHub repository page views and profile-image requests. These sources can overlap; it is not a count of unique people. GitHub refreshes repository traffic about hourly. README images are cached snapshots.',loading:'Loading the latest totals…',preview:'Read-only deployment preview. These are not production totals.',pending:'Repository sync is not connected yet. The total currently contains retained profile-image requests.',unavailable:'Cannot reach the counter. Showing the last totals received.',download:'Download transparent GIF',static:'Static loop'},
 'zh-CN':{label:'GitHub 累计浏览记录',repos:'仓库页面浏览',profile:'主页图片请求',description:'保持页面打开，数字会自动更新。读取这里的统计不会增加计数。',note:'合计包含 GitHub 仓库页面浏览和主页图片请求，两种来源可能重叠，不代表独立访客人数。GitHub 仓库流量约每小时更新；README 内的图片是缓存快照。',loading:'正在读取最新累计值…',preview:'只读部署预览，不代表正式统计。',pending:'仓库流量尚未接通。当前合计只包含已保留的主页图片请求。',unavailable:'暂时无法连接计数服务，继续显示上次收到的数字。',download:'下载透明 GIF',static:'静态折光体'}
};
function number(value){return value===null||value===undefined?'—':BigInt(value).toLocaleString(zh?'zh-CN':'en-US');}
function fit(){const total=$('total'),max=matchMedia('(max-width:560px)').matches?44:76;total.style.fontSize=Math.min(max,Math.max(12,$('total').parentElement.clientWidth/(Math.max(1,total.textContent.length)*.62)))+'px';}
function updateMotion(){const file=paused||document.hidden||!inView?'karmen-loop.png':'karmen-loop.gif';if($('form').getAttribute('src')!=='/'+file)$('form').src='/'+file;}
function update(){
 const lang=zh?'zh-CN':'en',t=translations[lang];document.documentElement.lang=lang;document.body.classList.toggle('light',light);
 $('language').textContent=zh?'English':'简体中文';$('language').setAttribute('aria-pressed',String(zh));
 $('theme').textContent=zh?(light?'深色背景':'浅色背景'):(light?'Dark background':'Light background');$('theme').setAttribute('aria-pressed',String(light));
 $('motion').textContent=zh?(paused?'播放动画':'暂停动画'):(paused?'Play motion':'Pause motion');$('motion').setAttribute('aria-pressed',String(paused));
 $('label').textContent=t.label;$('repos-label').textContent=t.repos;$('profile-label').textContent=t.profile;
 $('description').textContent=t.description;$('note').textContent=t.note;$('download').textContent=t.download;$('static').textContent=t.static;
 $('form').alt=zh?'KARMEN LOOP 银色流动折光体':"KARMEN LOOP's flowing silver refractive form";
 if(latest){
  const preview=latest.mode==='preview',total=preview?'—':number(latest.count);if($('total').textContent!==total)$('total').textContent=total;
  const repo=latest.sources?.repositoryPageViews,profile=latest.sources?.profileImageRequests;
  $('repos').textContent=number(repo?.count);$('profile').textContent=preview?'—':number(profile?.count??latest.count);
  if(preview)$('status').textContent=t.preview;
  else if(repo?.lastSyncedAt){
   const date=new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(repo.lastSyncedAt));
   $('status').textContent=zh?`已汇总 ${repo.coveredRepositories} 个仓库；上次同步：${date}${repo.status==='stale'?'。正在等待新数据。':'。'}`:`${repo.coveredRepositories} repositories · Last sync ${date}${repo.status==='stale'?' · Waiting for fresh data.':''}`;
  }else $('status').textContent=t.pending;
 }else $('status').textContent=t.loading;
 $('error').textContent=error?t.unavailable:'';fit();updateMotion();
}
const reader=createLiveReader({onData:data=>{latest=data;error=false;update();},onError:()=>{error=true;update();}});
$('language').onclick=()=>{zh=!zh;update();};$('theme').onclick=()=>{light=!light;update();};$('motion').onclick=()=>{paused=!paused;update();};
document.addEventListener('visibilitychange',()=>{updateMotion();if(document.hidden)reader.stop();else reader.start();});
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;updateMotion();}).observe($('form'));
new ResizeObserver(fit).observe($('total').parentElement);
matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',event=>{paused=event.matches;update();});
update();if(!document.hidden)reader.start();
