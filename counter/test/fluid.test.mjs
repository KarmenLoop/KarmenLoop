import test from 'node:test';
import assert from 'node:assert/strict';
import { fluidSurface, projectFluidLoop } from '../brand/fluid-loop.mjs';

const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));

test('the flowing surface closes in position and normal across the loop',()=>{
  const first=projectFluidLoop({phase:0,segments:32,lanes:12});
  const last=projectFluidLoop({phase:Math.PI*2,segments:32,lanes:12});
  for(let i=0;i<first.length;i++)for(let j=0;j<4;j++){
    assert.ok(distance(first[i][j].position,last[i][j].position)<1e-9);
    assert.ok(distance(first[i][j].normal,last[i][j].normal)<1e-8);
    assert.ok(Math.abs(Math.hypot(...first[i][j].normal)-1)<1e-9);
  }
});

test('flow changes local curvature rather than moving a rigid ring',()=>{
  const u=.4,v=.7;
  const rest=distance(fluidSurface(u,v,0),fluidSurface(u+.45,v,0));
  const flowed=distance(fluidSurface(u,v,Math.PI/2),fluidSurface(u+.45,v,Math.PI/2));
  assert.ok(Math.abs(rest-flowed)>.005,'local surface distances must change');
  for(let phase=0;phase<Math.PI*2;phase+=Math.PI/8){
    const mesh=projectFluidLoop({phase,segments:48,lanes:16});
    for(const face of mesh)for(const vertex of face){
      assert.ok(Number.isFinite(vertex.x)&&Number.isFinite(vertex.y));
      assert.ok(Math.hypot(vertex.x,vertex.y)>.17,'the center opening must remain open');
      assert.ok(Math.max(Math.abs(vertex.x),Math.abs(vertex.y))<.75,'the model must fit its frame');
    }
  }
});
