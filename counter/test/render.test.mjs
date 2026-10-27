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
  assert.equal(reader.width,680); assert.equal(reader.height,180);
  assert.equal(reader.numFrames(),60);
  const frames=[0,15,30,45].map(index=>{
    const pixels=new Uint8Array(680*180*4);reader.decodeAndBlitFrameRGBA(index,pixels);
    assert.equal(pixels[3],0,'outer corner must be transparent');
    assert.equal(pixels[(90*680+580)*4+3],0,'loop center must be open');
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
  assert.equal(new GifReader(large).width,680);
});

test('malformed counter values and unsupported rendering options are rejected', () => {
  for(const delta of [{count:'-1'},{count:'1.5'},{count:'<script>'},{count:'0'.repeat(30)},{lang:'xx'},{theme:'blue'},{startedAt:'yesterday'}])
    assert.throws(()=>renderCard({...input,...delta}));
});

test('the standalone loop is transparent and animated', async () => {
  const reader=new GifReader(await readFile(new URL('../public/karmen-loop.gif',import.meta.url)));
  assert.equal(reader.width,512);assert.equal(reader.height,512);assert.equal(reader.numFrames(),60);
  for(let i=0;i<reader.numFrames();i++){
    const pixels=new Uint8Array(512*512*4);reader.decodeAndBlitFrameRGBA(i,pixels);
    assert.equal(pixels[3],0);assert.equal(pixels[(256*512+256)*4+3],0);
  }
});
