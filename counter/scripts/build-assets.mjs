import { createCanvas, GlobalFonts, ImageData } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { avatarProfile, buildAvatarMesh, projectSmoothAvatar, shadeAvatarPoint } from '../brand/loop.mjs';
import { rasterize } from './rasterize.mjs';

const { GIFEncoder, quantize, applyPalette }=gifenc;
const root=new URL('../',import.meta.url);
await mkdir(new URL('assets/',root),{recursive:true});
await mkdir(new URL('public/',root),{recursive:true});
if(!GlobalFonts.registerFromPath(fileURLToPath(new URL('tmp/inter-variable.ttf',root)),'Inter'))
  throw Error('Download InterVariable.ttf to counter/tmp/inter-variable.ttf before building assets.');
const chineseFont=process.env.COUNTER_CJK_FONT;
if(chineseFont&&!GlobalFonts.registerFromPath(chineseFont,'Counter CJK'))throw Error('Cannot load COUNTER_CJK_FONT');
const profile={...avatarProfile('karmen:mark','karmen'),tint:[88,95,111],accent:[160,174,195]};
const mesh=buildAvatarMesh(profile,{segments:160,lanes:32});
const size=512, count=60, delay=100;
const canvas=createCanvas(size,size),ctx=canvas.getContext('2d');
function draw(frame){
  const angle=frame/count*Math.PI*2;
  const faces=projectSmoothAvatar(mesh,profile,{time:2+1.1*Math.sin(angle),flowTime:4+1.1*Math.cos(angle),
    pointer:{x:.12*Math.sin(angle),y:.07*Math.cos(angle)},roughness:.035});
  const pixels=rasterize(faces,size,(normal,position)=>shadeAvatarPoint(normal,position,profile));
  ctx.putImageData(new ImageData(pixels,size,size),0,0);return pixels;
}
// A shared palette keeps the reflections steady instead of flickering between frames.
const sample=draw(0), opaque=[];
for(let i=0;i<sample.length;i+=4)if(sample[i+3]>=128)opaque.push(sample[i],sample[i+1],sample[i+2],255);
const palette=[[255,0,255],...quantize(Uint8Array.from(opaque),252),[242,240,235],[29,28,26]];
const foreground={dark:palette.length-2,light:palette.length-1};
const gif=GIFEncoder(),small=createCanvas(180,180),smallCtx=small.getContext('2d');
const planes=[];
function indexed(rgba){
  const pixels=applyPalette(rgba,palette);
  for(let i=0;i<pixels.length;i++)if(rgba[i*4+3]<128)pixels[i]=0;
  return pixels;
}
for(let frame=0;frame<count;frame++){
  const rgba=draw(frame), pixels=indexed(rgba);
  gif.writeFrame(pixels,size,size,{palette:frame===0?palette:undefined,transparent:true,transparentIndex:0,delay,dispose:2,repeat:0});
  smallCtx.clearRect(0,0,180,180);smallCtx.drawImage(canvas,0,0,180,180);
  planes.push(indexed(smallCtx.getImageData(0,0,180,180).data));
  if(frame===0)await writeFile(new URL('public/karmen-loop.png',root),await canvas.encode('png'));
  if(frame%15===0)console.log(`Rendered ${frame+1}/${count} frames`);
}
gif.finish();await writeFile(new URL('public/karmen-loop.gif',root),gif.bytes());
await writeFile(new URL('assets/loop-frames.bin',root),deflateSync(Buffer.concat(planes),{level:9}));

const characters=new Set([...Array.from({length:95},(_,i)=>String.fromCharCode(32+i)).join(''),...'主页访问自起按图片请求估算年月日尚未开始']);
const atlas={};
for(const [name,fontSize] of [['number',52],['label',18],['detail',12]]){
  const glyphs={};
  for(const char of characters){
    const glyph=createCanvas(80,80),g=glyph.getContext('2d');
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
await writeFile(new URL('assets/render-data.json',root),JSON.stringify({palette,foreground,frameCount:count,delay,loopSize:180,atlas}));
console.log('Built transparent loop GIF, static PNG, indexed frames, and text atlas.');
