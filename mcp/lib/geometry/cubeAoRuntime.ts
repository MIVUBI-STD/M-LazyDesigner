import {Vector2,Vector3, type Mesh as ThreeMesh, type Material, type Texture as ThreeTexture} from "three";
import {resolveCoreCube} from "../coreIdentity";
import {bakeCubeAmbientOcclusionRgba,type AoTriangle,type AoUvTriangle,type AoVector} from "./cubeAmbientOcclusion";

export function bakeNativeCubeAo(texture:Texture,source:Uint8ClampedArray,width:number,height:number,
  options:{cube_ids:string[];radius:number;samples:number;bias:number;strength:number}){
  if(typeof Format==="undefined"||Format.id!=="bedrock")throw new Error("Cube AO requires Bedrock Entity format.");
  const targets=new Set(options.cube_ids.map(id=>resolveCoreCube(id)));
  const material=texture.material as Material & {map?:ThreeTexture};
  if(!material?.map)throw new Error("Cube AO requires the native texture map.");
  const surfaces:AoUvTriangle[]=[],triangles:AoTriangle[]=[];
  for(const cube of Cube.all){
    const mesh=cube.mesh as ThreeMesh;
    let visible=cube.visibility!==false;
    for(let parent=mesh;parent;parent=parent.parent as ThreeMesh)if(!parent.visible)visible=false;
    if(!visible){if(targets.has(cube))throw new Error("AO target Cube is hidden.");continue;}
    if(!mesh?.geometry)throw new Error("AO Cube preview geometry is unavailable.");
    mesh.updateWorldMatrix(true,false);
    const geometry=mesh.geometry,position=geometry.getAttribute("position"),uv=geometry.getAttribute("uv"),index=geometry.index;
    if(!position)throw new Error("AO Cube positions are unavailable.");
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const count=index?index.count:position.count;
    for(let start=0;start<count;start+=3){
      const ids=[0,1,2].map(i=>index?index.getX(start+i):start+i);
      const vertices=ids.map(i=>new Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).toArray()) as unknown as AoTriangle;
      const area=new Vector3().subVectors(new Vector3(...vertices[1]),new Vector3(...vertices[0])).cross(new Vector3().subVectors(new Vector3(...vertices[2]),new Vector3(...vertices[0]))).lengthSq();
      if(area<1e-20)continue;
      triangles.push(vertices);
      if(!targets.has(cube))continue;
      const group=geometry.groups.find(g=>start>=g.start&&start<g.start+g.count);
      const faceMaterial=materials[group?.materialIndex??0];
      if(faceMaterial!==material)continue;
      if(!uv)throw new Error("AO Cube UV attribute is unavailable.");
      const coords=ids.map(i=>{
        const point=new Vector2(uv.getX(i),uv.getY(i));
        material.map!.transformUv(point);
        return [point.x*width,point.y*height] as const;
      }) as unknown as AoUvTriangle["uv"];
      surfaces.push({vertices:vertices as readonly [AoVector,AoVector,AoVector],uv:coords});
    }
  }
  return bakeCubeAmbientOcclusionRgba(source,width,height,surfaces,triangles,options);
}
