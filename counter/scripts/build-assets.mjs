import { createCanvas, GlobalFonts, ImageData } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { projectFluidLoop, shadeFluidLoop } from '../brand/fluid-loop.mjs';
import { rasterize } from './rasterize.mjs';

const { GIFEncoder, quantize, applyPalette }=gifenc;
const root=new URL('../',import.meta.url);
await mkdir(new URL('assets/',root),{recursive:true});
await mkdir(new URL('public/',root),{recursive:true});
if(!GlobalFonts.registerFromPath(fileURLToPath(new URL('tmp/inter-variable.ttf',root)),'Inter'))
  throw Error('Download InterVariable.ttf to counter/tmp/inter-variable.ttf before building assets.');
const chineseFont=process.env.COUNTER_CJK_FONT;
if(chineseFont&&!GlobalFonts.registerFromPath(chineseFont,'Counter CJK'))throw Error('Cannot load COUNTER_CJK_FONT');
const size=640, count=120, delay=50, loopSize=260;
let palette,foreground;
if(process.argv.includes('--text-only')){
  const previous=JSON.parse(await readFile(new URL('assets/render-data.json',root),'utf8'));
  palette=previous.palette;foreground=previous.foreground;
}else{
  const canvas=createCanvas(size,size),ctx=canvas.getContext('2d');
  const high=createCanvas(size*2,size*2),highCtx=high.getContext('2d');
  function draw(frame){
    const phase=frame/count*Math.PI*2;
    const pixels=rasterize(projectFluidLoop({phase}),size*2,
      (normal,position)=>shadeFluidLoop(normal,position,phase));
    highCtx.putImageData(new ImageData(pixels,size*2,size*2),0,0);
    ctx.clearRect(0,0,size,size);ctx.drawImage(high,0,0,size,size);
    return ctx.getImageData(0,0,size,size).data;
  }
  // A shared palette keeps the reflections steady instead of flickering between frames.
  const opaque=[];
  for(const frame of [0,30,60,90]){
    const sample=draw(frame);
    for(let i=0;i<sample.length;i+=16)if(sample[i+3]>=128)opaque.push(sample[i],sample[i+1],sample[i+2],255);
  }
  palette=[[255,0,255],...quantize(Uint8Array.from(opaque),252),[242,240,235],[29,28,26]];
  foreground={dark:palette.length-2,light:palette.length-1};
  const gif=GIFEncoder(),small=createCanvas(loopSize,loopSize),smallCtx=small.getContext('2d');
  const planes=[];
  function indexed(rgba){
    const pixels=applyPalette(rgba,palette);
    for(let i=0;i<pixels.length;i++)if(rgba[i*4+3]<128)pixels[i]=0;
    return pixels;
  }
  for(let frame=0;frame<count;frame++){
    const rgba=draw(frame), pixels=indexed(rgba);
    gif.writeFrame(pixels,size,size,{palette:frame===0?palette:undefined,transparent:true,transparentIndex:0,delay,dispose:2,repeat:0});
    smallCtx.clearRect(0,0,loopSize,loopSize);smallCtx.drawImage(high,0,0,loopSize,loopSize);
    planes.push(indexed(smallCtx.getImageData(0,0,loopSize,loopSize).data));
    if(frame===0)await writeFile(new URL('public/karmen-loop.png',root),await canvas.encode('png'));
    if(frame%15===0)console.log(`Rendered ${frame+1}/${count} frames`);
  }
  gif.finish();await writeFile(new URL('public/karmen-loop.gif',root),gif.bytes());
  await writeFile(new URL('assets/loop-frames.bin',root),deflateSync(Buffer.concat(planes),{level:9}));
}
const characters=new Set([...Array.from({length:95},(_,i)=>String.fromCharCode(32+i)).join(''),...'总浏览量主页访问自起按图片请求估算年月日尚未开始累计记录仓库流待同步合并来源可能重叠历史数据，']);
const atlas={};
for(const [name,fontSize] of [['number',76],['label',21],['detail',14],['caption',12]]){
  const glyphs={};
  for(const char of characters){
    const glyph=createCanvas(110,110),g=glyph.getContext('2d');
    g.font=`${name==='number'?'500':'400'} ${fontSize}px Inter, ${chineseFont?'Counter CJK, ':''}PingFang SC, sans-serif`;
    g.textBaseline='top';g.fillStyle='white';g.fillText(char,0,0);
    const width=Math.ceil(g.measureText(char).width),height=fontSize+8;
    const data=g.getImageData(0,0,Math.max(1,width),height).data;
    const mask=new Uint8Array(Math.max(1,width)*height);
    for(let i=0;i<mask.length;i++)mask[i]=data[i*4+3]>=96?1:0;
    glyphs[char]={width,height,mask:Buffer.from(mask).toString('base64')};
  }
  atlas[name]=glyphs;
}
await writeFile(new URL('assets/render-data.json',root),JSON.stringify({revision:'account-1.2.0',palette,foreground,frameCount:count,delay,loopSize,cardWidth:720,cardHeight:260,atlas}));
console.log(process.argv.includes('--text-only')?'Updated text atlas; flowing artwork retained.':'Built transparent loop GIF, static PNG, indexed frames, and text atlas.');
