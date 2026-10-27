// Native KARMEN LOOP geometry and material, captured from karmenloop.com on 2026-10-27.
// Browser renderer omitted; pure geometry is rendered into GIF frames at build time.
/**
 * Karmen Fold — deterministic, deformable surfaces and a procedural studio.
 * Native WebGL, with the same geometry and material in a small Canvas fallback.
 * No assets, requests or telemetry. Visual activity is never service health.
 */
const TAU = Math.PI * 2;
const STATES = new Set(['idle', 'thinking', 'responding', 'error']);
const BRANCHES = {
  karmen:  { lobes: 3, tint: [190, 191, 185], accent:[216,212,198], title:'Karmen', softness:.068 },
  weho:    { lobes: 4, tint: [166, 172, 169], accent:[210,211,200], title:'Karmen AI（理性务实）', softness:.052 },
  qingluai:{ lobes: 2, tint: [187, 182, 165], accent:[220,214,196], title:'Karmen AI（温和细致）', softness:.080 },
  qelvant: { lobes: 5, tint: [171, 173, 158], accent:[207,207,191], title:'Karmen AI（开放敏锐）', softness:.045 }
};
const VARIANTS=Object.freeze({classic:'karmen',practical:'weho',considerate:'qingluai',exploratory:'qelvant'});
export function resolveAvatarBranch(variant,legacyBranch){
  if(Object.hasOwn(VARIANTS,variant))return VARIANTS[variant];
  return Object.hasOwn(BRANCHES,legacyBranch)?legacyBranch:'karmen';
}
const LABELS={idle:'静息形态',thinking:'正在准备回复',responding:'回复已返回',error:'请求未完成'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const unit=([x,y,z])=>{const d=Math.hypot(x,y,z)||1;return [x/d,y/d,z/d];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function normalizeAvatarState(value){return STATES.has(value)?value:'idle';}
const stateWeights=state=>{const name=normalizeAvatarState(state);return [Number(name==='thinking'),Number(name==='responding'),Number(name==='error')];};
const flowSpeed=([thinking,responding,error])=>1+thinking*2.2+responding*2.6-error*.4;
const stateColors={tint:[[103,179,189],[224,177,108],[210,126,57]],accent:[[185,225,230],[249,225,175],[247,182,102]]};
function surfaceProfile(profile,mix){
  const color=key=>profile[key].map((value,channel)=>value+mix.reduce((sum,weight,index)=>sum+weight*(stateColors[key][index][channel]-value),0));
  return {...profile,tint:color('tint'),accent:color('accent')};
}

export function avatarProfile(seed='karmen',branch='karmen'){
  const name=Object.hasOwn(BRANCHES,branch)?branch:'karmen';let hash=2166136261;
  for(const char of String(seed).slice(0,256))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return Object.freeze({...BRANCHES[name],branch:name,phase:(hash%6283)/1000,
    lean:((hash>>>8)%100)/500-.1,ridge:.93+((hash>>>16)%100)/700});
}

// A seamless elliptical tube. Integer winding closes both position and normal;
// unlike a half-twist, the final strip has exactly the first strip's vertices.
export function buildAvatarMesh(profile,{segments=96,lanes=16}={}){
  segments=clamp(Math.round(segments)||96,24,160);lanes=clamp(Math.round(lanes)||16,8,32);
  const vertex=(i,j)=>{
    const t=((i%segments)+segments)%segments/segments*TAU,s=((j%lanes)+lanes)%lanes/lanes*TAU;
    const phase=profile.phase*.16,wave=profile.lobes*t+phase;
    const r=.455+profile.softness*Math.cos(wave)+.014*Math.sin(t*2+phase);
    const twist=t+.22*Math.sin(t*2+phase);
    const width=.169*profile.ridge*(1+.10*Math.sin(t*3+phase));
    const a=width*Math.cos(s),b=.139*(1+.08*Math.cos(t*2))*Math.sin(s);
    const radial=a*Math.cos(twist)-b*Math.sin(twist);
    return [(r+radial)*Math.cos(t),(r+radial)*Math.sin(t),.115*Math.sin(t*2+phase)+.045*Math.cos(wave)+a*Math.sin(twist)+b*Math.cos(twist)];
  };
  const vertices=[],normals=[];
  for(let i=0;i<segments;i++)for(let j=0;j<lanes;j++){
    vertices.push(vertex(i,j));normals.push(unit(cross(sub(vertex(i+.002,j),vertex(i-.002,j)),sub(vertex(i,j+.002),vertex(i,j-.002)))));
  }
  const at=(i,j)=>(i%segments)*lanes+j%lanes,faces=[];
  for(let i=0;i<segments;i++)for(let j=0;j<lanes;j++){
    const ids=[at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1)],points=ids.map(id=>vertices[id]);
    faces.push({points,normals:ids.map(id=>normals[id]),normal:unit(ids.reduce((sum,id)=>sum.map((n,k)=>n+normals[id][k]),[0,0,0]))});
  }
  return faces;
}

// Bounded travelling waves change local curvature rather than only spinning a
// rigid object. This exact field is also evaluated in the vertex shader.
export function deformAvatarPoint([x,y,z],profile,{time=0,flowTime,state='idle',stateMix,activity=0,energy=0}={}){
  const mix=stateMix||stateWeights(state),[thinking,responding,error]=mix;
  const t=(flowTime??time*flowSpeed(mix))*.72+profile.phase;
  const radius=Math.hypot(x,y),angle=Math.atan2(y,x),influence=smooth(.06,.18,radius);
  const tube=1+thinking*.18-responding*.20+error*.10;
  const ring=radius+influence*((radius-.455)*(tube-1)-thinking*.060+responding*.020-error*.024
    +thinking*.023*Math.cos(angle*3-t*1.3)+responding*.033*Math.sin(angle*3-t*1.55)+error*.008*Math.sin(angle*4+t*.5));
  const radial=radius>.00001?ring/radius:1;
  const shapeX=x*radial*(1-thinking*.12+responding*.12-error*.25);
  const shapeY=y*radial*(1-thinking*.08-responding*.27+error*.065);
  const shapeZ=z*(1+thinking*.16+responding*.08-error*.18)+influence*(thinking*.042*Math.sin(angle*3-t*1.1)+responding*.068*Math.sin(angle*2-t*1.25)+error*.014*Math.sin(angle*2+t*.5));
  const amp=.027+clamp(activity,0,1)*.015+thinking*.020+responding*.026-error*.007;
  const pulse=clamp(energy,0,1),wave=Math.sin(x*4-y*3+t*1.45);
  return [shapeX+amp*Math.sin(y*4.2+t)+.015*Math.sin(z*5.1-t*.71)+pulse*.020*wave,
    shapeY+amp*Math.sin(x*3.8-t*.83)+.014*Math.cos(z*4.6+t*.63)-pulse*.026*wave,
    shapeZ+amp*1.25*Math.sin(x*3.2+y*2.7+t*.74)+.012*Math.cos(y*5.3-t)+pulse*.032*wave];
}
function deformNormal(point,normal,profile,options){
  const tangent=unit(cross(Math.abs(normal[1])<.9?[0,1,0]:[1,0,0],normal)),bitangent=cross(normal,tangent);
  const p=deformAvatarPoint(point,profile,options);
  const offset=v=>deformAvatarPoint(point.map((n,i)=>n+v[i]*.002),profile,options);
  return unit(cross(sub(offset(tangent),p),sub(offset(bitangent),p)));
}
export function shouldAnimateAvatar({connected,visible,documentVisible,reducedMotion,paused,size}){
  return Boolean(connected&&visible&&documentVisible&&!reducedMotion&&!paused&&size>0);
}
function avatarPose(profile,{time=0,pointer={x:0,y:0},energy=0}={}){
  const phase=profile.phase;
  return {breath:1+Math.sin(time*1.05+phase)*.011+energy*.012,
    ax:-.34+Math.sin(time*.25+phase)*.15+clamp(pointer.y||0,-1,1)*.25,
    ay:.30+Math.cos(time*.21+phase)*.22+clamp(pointer.x||0,-1,1)*.32,
    az:-.23+profile.lean+Math.sin(time*.17+phase)*.13};
}
function rotation({ax:a,ay:b,az:c}){
  return ([x,y,z])=>{const q=y*Math.cos(a)-z*Math.sin(a),r=y*Math.sin(a)+z*Math.cos(a),s=x*Math.cos(b)+r*Math.sin(b),v=-x*Math.sin(b)+r*Math.cos(b);return [s*Math.cos(c)-q*Math.sin(c),s*Math.sin(c)+q*Math.cos(c),v];};
}
function material(normal,point,profile,roughness=0,field){
  const view=unit(sub([0,0,3.1],point));let n=normal;if(dot(n,view)<0)n=n.map(v=>-v);
  const facing=clamp(dot(n,view),0,1),r=n.map((v,i)=>2*facing*v-view[i]);
  const panel=Math.exp(-Math.pow((r[0]+.32)/(.60+roughness*.5),4)-Math.pow((r[1]-.52)/(.34+roughness*.5),4));
  const strip=Math.exp(-Math.pow((r[0]-.65)/(.105+roughness*.4),2))*smooth(-.55,.2,r[2]);
  const lower=Math.exp(-Math.pow((r[1]+.62)/.20,2))*smooth(-.4,.5,r[2]);
  const rim=Math.pow(1-facing,3),soft=Math.max(0,dot(n,unit([-.4,-.5,1])));
  const hue=smooth(-.6,.7,r[0]+r[1]*.35),shade=.045+smooth(-.6,.9,r[1])*.115;
  const tint=profile.tint.map(v=>v/255);
  const accent=profile.accent.map(v=>v/255);
  return tint.map((v,i)=>{const film=v*(1-hue*.42)+accent[i]*hue*.42;
    const light=film*(shade+soft*.15)+panel*(.28+v*.88)+strip*(.48+accent[i]*.32)+lower*film*.44+rim*(.035+film*.14);
    const factor=field?.[i]===undefined?1:1+(.7+field[i]*.55-1)*.28;
    const lit=light*factor;
    return Math.round(255*Math.pow(clamp(lit/(lit+.62),0,1),1/2.2));});
}
export function projectAvatar(mesh,profile,{time=0,flowTime,state='idle',stateMix,pointer={x:0,y:0},energy=0,activity=0,roughness=0,lightField}={}){
  const mix=stateMix||stateWeights(state),options={time,flowTime,stateMix:mix,activity,energy},pose=avatarPose(profile,{time,pointer,energy}),rotate=rotation(pose),colored=surfaceProfile(profile,mix);
  return mesh.map(face=>{
    const center=face.points.reduce((sum,p)=>sum.map((v,i)=>v+p[i]/4),[0,0,0]);
    const normal=rotate(deformNormal(center,face.normal,profile,options));
    const points3=face.points.map(p=>rotate(deformAvatarPoint(p,profile,options)));
    const center3=rotate(deformAvatarPoint(center,profile,options));
    const scale=pose.breath*3.1/(3.1-center3[2]);
    const viewportPoint=lightField&&normalizeViewportPoint({
      x:lightField.viewport.x+(.5+center3[0]*scale*.56)*lightField.viewport.width,
      y:lightField.viewport.y+(.5+center3[1]*scale*.56)*lightField.viewport.height,
      viewport:lightField.viewportSize,
    });
    const field=viewportPoint&&sampleLightField({...viewportPoint,time:lightField.time,palette:lightField.palette,region:lightField.region});
    const rgb=material(normal,center3,colored,roughness,field);
    return {points:points3.map(([x,y,z])=>{const scale=pose.breath*3.1/(3.1-z);return [x*scale,y*scale];}),depth:points3.reduce((sum,p)=>sum+p[2],0)/4,color:`rgb(${rgb.join(',')})`};
  }).sort((a,b)=>a.depth-b.depth);
}

// Preserve the native vertex normals for smooth offline shading. The browser
// uses the same normals in its WebGL shader; flat Canvas polygons lose them.
export function projectSmoothAvatar(mesh,profile,options={}){
  const pose=avatarPose(profile,options),rotate=rotation(pose),mix=stateWeights('idle');
  return mesh.map(face=>face.points.map((point,index)=>{
    const p=rotate(deformAvatarPoint(point,profile,options));
    const n=rotate(deformNormal(point,face.normals[index],profile,options));
    const scale=pose.breath*3.1/(3.1-p[2]);
    return {x:p[0]*scale,y:p[1]*scale,z:p[2],normal:n,position:p};
  }));
}

export function shadeAvatarPoint(normal,position,profile){
  return material(unit(normal),position,profile,.035).map(value=>Math.round(255*Math.pow(value/255,1.7)));
}

