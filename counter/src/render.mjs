import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import gifenc from 'gifenc';

const { GIFEncoder }=gifenc;
const assetRoot=[fileURLToPath(new URL('../assets/',import.meta.url)),resolve('assets'),join(process.env.LAMBDA_TASK_ROOT||'.','assets')]
  .find(path=>existsSync(join(path,'render-data.json')));
if(!assetRoot)throw Error('Counter render assets are missing');
const data=JSON.parse(readFileSync(join(assetRoot,'render-data.json'),'utf8'));
const planes=inflateSync(readFileSync(join(assetRoot,'loop-frames.bin')));
for(const glyphs of Object.values(data.atlas))for(const glyph of Object.values(glyphs))glyph.mask=Buffer.from(glyph.mask,'base64');
const width=data.cardWidth,height=data.cardHeight;
function text(target,copy,x,y,kind,color,maxWidth=390){
  const glyphs=data.atlas[kind],natural=[...copy].reduce((sum,char)=>sum+(glyphs[char]?.width||0),0);
  const scale=Math.min(1,maxWidth/Math.max(1,natural));let cursor=x;
  for(const char of copy){
    const glyph=glyphs[char];if(!glyph)throw Error(`Missing glyph: ${char}`);
    const w=Math.max(1,Math.round(glyph.width*scale)),h=Math.round(glyph.height*scale);
    for(let row=0;row<h;row++)for(let col=0;col<w;col++){
      const source=Math.floor(row/scale)*Math.max(1,glyph.width)+Math.min(Math.max(0,glyph.width-1),Math.floor(col/scale));
      if(glyph.mask[source]){
        const tx=Math.round(cursor)+col,ty=y+row;
        if(tx>=0&&tx<width&&ty>=0&&ty<height)target[ty*width+tx]=color;
      }
    }
    cursor+=glyph.width*scale;
  }
}

export function renderCard({count,startedAt,lang='en',theme='dark',animated=true,recorded=false,repoCount=null,profileCount=null}){
  if(typeof count!=='string'||!/^(0|[1-9]\d{0,39})$/.test(count))throw Error('Invalid count');
  if(!['en','zh-CN'].includes(lang)||!['light','dark'].includes(theme)||typeof animated!=='boolean')throw Error('Invalid render options');
  const date=startedAt===null?null:new Date(startedAt);
  if(startedAt!==null&&(!/^\d{4}-\d{2}-\d{2}T/.test(startedAt)||!Number.isFinite(date.getTime())))throw Error('Invalid start date');
  const color=data.foreground[theme],overlay=new Uint8Array(width*height),zh=lang==='zh-CN';
  text(overlay,recorded?(zh?'GitHub 累计浏览记录':'Recorded GitHub views'):(zh?'总浏览量':'Total profile views'),300,44,'label',color);
  text(overlay,BigInt(count).toLocaleString('en-US'),300,77,'number',color,390);
  const dateCopy=date?(zh?`自 ${date.getUTCFullYear()} 年 ${date.getUTCMonth()+1} 月 ${date.getUTCDate()} 日起`:
    `Since ${new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date)}`):
    (zh?'尚未开始':'Not started yet');
  if(recorded){
    text(overlay,repoCount===null||repoCount===undefined?(zh?'仓库流量待同步':'Repository sync pending'):(zh?`仓库 ${repoCount}  主页图片 ${profileCount}`:`Repositories ${repoCount} / Profile images ${profileCount}`),300,165,'detail',color);
    text(overlay,dateCopy,300,192,'detail',color);
    text(overlay,zh?'合并来源，可能重叠':'Combined sources; may overlap',300,220,'caption',color);
  }else{
    text(overlay,dateCopy,300,180,'detail',color);
    text(overlay,zh?'按图片请求估算':'Estimated from image requests',300,208,'caption',color);
  }
  const encoder=GIFEncoder(),frames=animated?data.frameCount:1,size=data.loopSize;
  for(let frame=0;frame<frames;frame++){
    const image=overlay.slice(),plane=planes.subarray(frame*size*size,(frame+1)*size*size);
    for(let row=0;row<size;row++)image.set(plane.subarray(row*size,(row+1)*size),row*width);
    encoder.writeFrame(image,width,height,{palette:frame===0?data.palette:undefined,transparent:true,transparentIndex:0,
      delay:animated?data.delay:0,dispose:2,repeat:0});
  }
  encoder.finish();return Buffer.from(encoder.bytes());
}
