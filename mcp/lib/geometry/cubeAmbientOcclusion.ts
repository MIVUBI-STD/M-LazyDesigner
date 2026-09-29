export type AoVector = readonly [number, number, number];
export type AoTriangle = readonly [AoVector, AoVector, AoVector];
export type AoUvTriangle = {vertices:AoTriangle;uv:readonly [readonly [number,number],readonly [number,number],readonly [number,number]]};
const sub = (a: AoVector, b: AoVector): AoVector => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot = (a: AoVector,b: AoVector) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: AoVector,b: AoVector): AoVector => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = (v: AoVector): AoVector => {
  const length=Math.hypot(...v);
  if(!Number.isFinite(length)||length===0)throw new Error("AO requires a finite nonzero normal.");
  return [v[0]/length,v[1]/length,v[2]/length];
};

function intersects(origin:AoVector,direction:AoVector,triangle:AoTriangle,radius:number):boolean {
  const edge1=sub(triangle[1],triangle[0]),edge2=sub(triangle[2],triangle[0]);
  const h=cross(direction,edge2),det=dot(edge1,h);
  if(Math.abs(det)<1e-12)return false;
  const s=sub(origin,triangle[0]),u=dot(s,h)/det;
  if(u<0||u>1)return false;
  const q=cross(s,edge1),v=dot(direction,q)/det;
  if(v<0||u+v>1)return false;
  const distance=dot(edge2,q)/det;
  return distance>0&&distance<=radius;
}

/** World-space, cosine-weighted hemisphere visibility; caller owns UV mapping and pose. */
export function sampleCubeAmbientOcclusion(
  points:readonly {position:AoVector;normal:AoVector}[],
  triangles:readonly AoTriangle[],
  options:{radius:number;samples:number;bias:number},
):number[] {
  const {radius,samples,bias}=options;
  if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(bias)||bias<=0||bias>=radius||
      !Number.isInteger(samples)||samples<1||samples>256)throw new Error("Invalid AO radius, bias or sample count.");
  for(const triangle of triangles)for(const vertex of triangle){
    if(vertex.length!==3||!vertex.every(Number.isFinite))throw new Error("AO geometry must be finite world-space triangles.");
  }
  // Validate all inputs before doing potentially expensive sampling.
  const surfaces=points.map(point=>{
    if(point.position.length!==3||!point.position.every(Number.isFinite))throw new Error("AO surface position must be finite.");
    const normal=unit(point.normal);
    const tangent=unit(cross(Math.abs(normal[1])<.9?[0,1,0]:[1,0,0],normal));
    return {position:point.position,normal,tangent,bitangent:cross(normal,tangent)};
  });
  return surfaces.map(({position,normal,tangent,bitangent})=>{
    const origin=position.map((v,i)=>v+normal[i]*bias) as unknown as AoVector;
    if(!origin.every(Number.isFinite))throw new Error("AO ray origin overflow.");
    let blocked=0;
    for(let i=0;i<samples;i++){
      const r=Math.sqrt((i+.5)/samples),angle=i*Math.PI*(3-Math.sqrt(5));
      const x=r*Math.cos(angle),y=r*Math.sin(angle),z=Math.sqrt(1-r*r);
      const direction=normal.map((n,j)=>tangent[j]*x+bitangent[j]*y+n*z) as unknown as AoVector;
      if(triangles.some(triangle=>intersects(origin,direction,triangle,radius)))blocked++;
    }
    return blocked/samples;
  });
}

/** UVs are bitmap pixel coordinates after the native texture transform. */
export function bakeCubeAmbientOcclusionRgba(source:Uint8ClampedArray,width:number,height:number,
  surfaces:readonly AoUvTriangle[],occluders:readonly AoTriangle[],
  options:{radius:number;samples:number;bias:number;strength:number}) {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||source.length!==width*height*4||
    !Number.isFinite(options.strength)||options.strength<=0||options.strength>1)throw new Error("Invalid AO bitmap or strength.");
  const mapped=new Map<number,{position:AoVector;normal:AoVector}>();
  for(const surface of surfaces){
    if(!surface.uv.every(uv=>uv.every(Number.isFinite)&&uv[0]>=0&&uv[0]<=width&&uv[1]>=0&&uv[1]<=height))throw new Error("AO UV lies outside the bitmap.");
    const [a,b,c]=surface.uv;
    const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(det)<1e-10)continue;
    const normal=unit(cross(sub(surface.vertices[1],surface.vertices[0]),sub(surface.vertices[2],surface.vertices[0])));
    for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])));y<Math.min(height,Math.ceil(Math.max(a[1],b[1],c[1])));y++){
      for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])));x<Math.min(width,Math.ceil(Math.max(a[0],b[0],c[0])));x++){
        const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/det;
        const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/det,w=1-u-v;
        if(Math.min(u,v,w)<-1e-9)continue;
        const index=y*width+x;
        if(source[index*4+3]===0)continue;
        const position=surface.vertices[0].map((_,i)=>surface.vertices[0][i]*u+surface.vertices[1][i]*v+surface.vertices[2][i]*w) as unknown as AoVector;
        const previous=mapped.get(index);
        if(previous&&(Math.hypot(...sub(previous.position,position))>1e-6||dot(previous.normal,normal)<.999999))throw new Error("AO has overlapping UV surfaces; separate their UV islands before baking.");
        mapped.set(index,{position,normal});
      }
    }
  }
  if(!mapped.size)throw new Error("AO found no mapped nontransparent texels.");
  if(mapped.size*options.samples*Math.max(1,occluders.length)>20_000_000)throw new Error("AO work exceeds the bounded bake budget; reduce samples or target area.");
  const entries=[...mapped.entries()],occlusion=sampleCubeAmbientOcclusion(entries.map(([,point])=>point),occluders,options);
  const pixels=new Uint8ClampedArray(source);
  let writes=0;const rect:[number,number,number,number]=[width,height,0,0];
  entries.forEach(([index],i)=>{
    const factor=1-options.strength*occlusion[i];let changed=false;
    for(let channel=0;channel<3;channel++){
      const value=Math.round(source[index*4+channel]*factor);
      if(value!==source[index*4+channel])changed=true;
      pixels[index*4+channel]=value;
    }
    if(changed){writes++;const x=index%width,y=Math.floor(index/width);rect[0]=Math.min(rect[0],x);rect[1]=Math.min(rect[1],y);rect[2]=Math.max(rect[2],x+1);rect[3]=Math.max(rect[3],y+1);}
  });
  if(!writes)throw new Error("AO would not change the texture.");
  return {pixels,operation_count:1,pixel_writes:writes,affected_rect:rect};
}
