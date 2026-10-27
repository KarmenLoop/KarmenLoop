// KARMEN LOOP's three-lobed, open refractive form, with travelling surface flow.
// Every temporal term is an integer harmonic of phase for a seamless loop.
const TAU=Math.PI*2;
const unit=v=>{const d=Math.hypot(...v);return v.map(n=>n/d);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((n,i)=>n-b[i]);

export function fluidSurface(u,v,phase){
  const radius=.437+.059*Math.cos(3*u+.28)+.018*Math.sin(2*u-phase)+.009*Math.cos(5*u+2*phase);
  const width=.137*(1+.13*Math.sin(3*u-phase)+.055*Math.cos(2*u+2*phase));
  const twist=u+.28*Math.sin(2*u+.3)+.27*Math.sin(3*u-phase);
  const a=width*Math.cos(v),b=.119*(1+.12*Math.cos(2*u-phase))*Math.sin(v);
  const radial=a*Math.cos(twist)-b*Math.sin(twist);
  return [(radius+radial)*Math.cos(u),
    (radius+radial)*Math.sin(u)*1.04,
    .068*Math.sin(2*u+.2)+.023*Math.cos(3*u)+a*Math.sin(twist)+b*Math.cos(twist)
      +.026*Math.sin(3*u-phase)+.012*Math.cos(2*u+phase)];
}

export function projectFluidLoop({phase=0,segments=224,lanes=48}={}){
  const ax=-.18+.09*Math.sin(phase),ay=.19+.10*Math.cos(phase),az=-1.48+.035*Math.sin(phase);
  const rotate=([x,y,z])=>{
    const q=y*Math.cos(ax)-z*Math.sin(ax),r=y*Math.sin(ax)+z*Math.cos(ax);
    const s=x*Math.cos(ay)+r*Math.sin(ay),v=-x*Math.sin(ay)+r*Math.cos(ay);
    return [s*Math.cos(az)-q*Math.sin(az),s*Math.sin(az)+q*Math.cos(az),v];
  };
  const points=[];
  for(let i=0;i<segments;i++)for(let j=0;j<lanes;j++){
    const u=i/segments*TAU,v=j/lanes*TAU,p=rotate(fluidSurface(u,v,phase)),e=.0002;
    const du=sub(fluidSurface(u+e,v,phase),fluidSurface(u-e,v,phase));
    const dv=sub(fluidSurface(u,v+e,phase),fluidSurface(u,v-e,phase));
    const normal=rotate(unit(cross(du,dv))),perspective=3.8/(3.8-p[2]);
    points.push({x:p[0]*perspective,y:p[1]*perspective,z:p[2],normal,position:p});
  }
  const at=(i,j)=>points[(i%segments)*lanes+j%lanes],faces=[];
  for(let i=0;i<segments;i++)for(let j=0;j<lanes;j++)faces.push([at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1)]);
  return faces;
}

export function shadeFluidLoop(normal,position,phase){
  const n=unit(normal),view=unit([-position[0],-position[1],3.8-position[2]]);
  let facing=n[0]*view[0]+n[1]*view[1]+n[2]*view[2];
  if(facing<0){for(let i=0;i<3;i++)n[i]=-n[i];facing=-facing;}
  const r=n.map((value,i)=>2*facing*value-view[i]);
  // Broad and narrow studio sources produce long reflections on the real curved
  // surface. Their slow periodic drift accompanies, rather than substitutes for,
  // the deformation of the geometry itself.
  const turn=.12*Math.sin(phase),rx=r[0]*Math.cos(turn)-r[1]*Math.sin(turn),ry=r[0]*Math.sin(turn)+r[1]*Math.cos(turn);
  const key=Math.exp(-Math.pow((rx+.48)/.28,2)-Math.pow((ry-.28)/.9,4));
  const ribbon=Math.exp(-Math.pow((rx-.38+.12*ry)/.072,2)-Math.pow((ry+.15)/.88,4));
  const top=Math.exp(-Math.pow((ry+.64)/.10,2)-Math.pow(rx/.85,4));
  const fill=Math.exp(-Math.pow((rx+.05)/.8,2)-Math.pow((ry-.68)/.24,2));
  const fresnel=Math.pow(1-Math.min(1,facing),3.2);
  const environment=.009+.013*(ry+1)/2+.012*Math.max(0,n[1]);
  const shade=environment+.36*key+.61*ribbon+.23*top+.055*fill+.10*fresnel;
  return [.78,.85,1].map((tint,i)=>{
    const light=shade*tint+fresnel*.015;
    return Math.round(255*Math.pow(Math.max(0,Math.min(1,light/(light+.48))),1/2.2));
  });
}
