import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { GifReader } from 'omggif';
import { renderCard } from '../src/render.mjs';

const input = {count:'1234',startedAt:'2026-10-27T00:00:00.000Z',lang:'en',theme:'dark',animated:true};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('the card is a transparent animated GIF with changing frames', () => {
  const bytes=renderCard(input), reader=new GifReader(bytes);
  assert.equal(bytes.subarray(0,6).toString(),'GIF89a');
  assert.equal(reader.width,720); assert.equal(reader.height,260);
  assert.equal(reader.numFrames(),120);
  assert.equal(reader.frameInfo(0).delay,5);
  const frames=[0,30,60,90].map(index=>{
    const pixels=new Uint8Array(720*260*4);reader.decodeAndBlitFrameRGBA(index,pixels);
    assert.equal(pixels[3],0,'outer corner must be transparent');
    assert.equal(pixels[(130*720+130)*4+3],0,'loop center must be open');
    assert.ok(pixels.some((v,i)=>i%4===3&&v===255),'object and text must be visible');
    return digest(pixels);
  });
  assert.equal(new Set(frames).size,4);
});

test('the static option has one frame; language, count, and theme change output', () => {
  const base=renderCard({...input,animated:false});
  assert.equal(new GifReader(base).numFrames(),1);
  for(const delta of [{count:'1235'},{lang:'zh-CN'},{theme:'light'},{startedAt:'2026-11-01T00:00:00Z'}])
    assert.notEqual(digest(base),digest(renderCard({...input,animated:false,...delta})));
  const large=renderCard({...input,count:'9223372036854775807',animated:false});
  assert.equal(new GifReader(large).width,720);
});

test('malformed counter values and unsupported rendering options are rejected', () => {
  for(const delta of [{count:'-1'},{count:'1.5'},{count:'<script>'},{count:'0'.repeat(30)},{lang:'xx'},{theme:'blue'},{startedAt:'yesterday'}])
    assert.throws(()=>renderCard({...input,...delta}));
});

test('the standalone loop is transparent and animated', async () => {
  const reader=new GifReader(await readFile(new URL('../public/karmen-loop.gif',import.meta.url)));
  assert.equal(reader.width,640);assert.equal(reader.height,640);assert.equal(reader.numFrames(),120);
  for(let i=0;i<reader.numFrames();i++){
    const pixels=new Uint8Array(640*640*4);reader.decodeAndBlitFrameRGBA(i,pixels);
    assert.equal(pixels[3],0);assert.equal(pixels[(320*640+320)*4+3],0);
  }
});

// The liquid form can move; the tally and its labels must remain stationary.
test('the total remains readable and still while the form flows',()=>{
  const reader=new GifReader(renderCard(input));
  const text=[];
  for(const index of [0,30,60,90]){
    const pixels=new Uint8Array(720*260*4);reader.decodeAndBlitFrameRGBA(index,pixels);
    const crop=[];
    for(let y=0;y<260;y++)for(let x=280;x<720;x++)crop.push(...pixels.subarray((y*720+x)*4,(y*720+x)*4+4));
    text.push(digest(Uint8Array.from(crop)));
  }
  assert.equal(new Set(text).size,1);
  const frame=new Uint8Array(720*260*4);reader.decodeAndBlitFrameRGBA(0,frame);
  assert.ok(frame.some((v,i)=>i%4===3&&Math.floor(i/4)%720>=300&&v===255));
});

test('account snapshots render both sources, pending state, and both languages',()=>{
 for(const lang of ['en','zh-CN'])for(const repoCount of ['537',null]){
  const bytes=renderCard({...input,count:'545',profileCount:'8',repoCount,recorded:true,lang,animated:false});
  const reader=new GifReader(bytes);assert.equal(reader.width,720);assert.equal(reader.numFrames(),1);
  const pixels=new Uint8Array(720*260*4);reader.decodeAndBlitFrameRGBA(0,pixels);
  let sourceInk=0;for(let y=165;y<240;y++)for(let x=300;x<700;x++)sourceInk+=pixels[(y*720+x)*4+3]>0?1:0;
  assert.ok(sourceInk>200,'the source explanation and history must be present');
 }
});
