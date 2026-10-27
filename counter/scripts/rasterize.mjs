// Smoothly interpolate the native vertex shading with a depth buffer. This is
// an offline renderer, not an approximation made by blurring polygon edges.
export function rasterize(quads,size,shade){
  const rgba=new Uint8ClampedArray(size*size*4),depth=new Float32Array(size*size).fill(-Infinity);
  const project=p=>({...p,x:size/2+p.x*size*.65,y:size/2+p.y*size*.65});
  for(const quad of quads){
    const points=quad.map(project);
    for(const indices of [[0,1,2],[0,2,3]]){
      const [a,b,c]=indices.map(i=>points[i]);
      const det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(det)<1e-8)continue;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(size-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(size-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const fx=x+.5,fy=y+.5;
        const u=((b.y-c.y)*(fx-c.x)+(c.x-b.x)*(fy-c.y))/det;
        const v=((c.y-a.y)*(fx-c.x)+(a.x-c.x)*(fy-c.y))/det,w=1-u-v;
        if(u<0||v<0||w<0)continue;
        const z=u*a.z+v*b.z+w*c.z,index=y*size+x;if(z<depth[index])continue;
        depth[index]=z;
        const normal=a.normal.map((n,i)=>u*n+v*b.normal[i]+w*c.normal[i]);
        const position=a.position.map((n,i)=>u*n+v*b.position[i]+w*c.position[i]);
        const rgb=shade(normal,position);
        for(let ch=0;ch<3;ch++)rgba[index*4+ch]=rgb[ch];
        rgba[index*4+3]=255;
      }
    }
  }
  return rgba;
}
