import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { GeometrySignalEvidence, TextureRect } from "@/lib/texture/geometrySignalBuilder";

export type GeometrySignalFaceBinding={
  instance_id:string;
  atlas_rect:TextureRect;
  world_normal:[number,number,number];
  contact?:boolean;
  cavity?:boolean;
};

export type GeometrySignalCompileInput={
  compiled:CompiledAuthoringRecipe;
  width:number;
  height:number;
  faces:readonly GeometrySignalFaceBinding[];
  edge_falloff?:number;
  lower_grime_power?:number;
};

export function compileGeometrySignalEvidence(input:GeometrySignalCompileInput):GeometrySignalEvidence{
  if(!Number.isInteger(input.width)||input.width<=0||!Number.isInteger(input.height)||input.height<=0) throw new Error("Geometry signal compiler dimensions must be positive integers.");
  const owned=new Set(input.compiled.placements.map((placement)=>placement.id));
  const cavity_regions:TextureRect[]=[];
  const contact_regions:TextureRect[]=[];
  let weightedNormal:[number,number,number]=[0,0,0];
  let totalArea=0;
  for(const face of input.faces){
    if(!owned.has(face.instance_id)) throw new Error("Geometry signal face binding references unowned instance "+face.instance_id+".");
    const r=face.atlas_rect;
    if(![r.x,r.y,r.width,r.height,...face.world_normal].every(Number.isFinite)||r.width<=0||r.height<=0){
      throw new Error("Geometry signal face binding contains invalid rect or world normal.");
    }
    const area=r.width*r.height;
    const nlen=Math.hypot(...face.world_normal);
    if(nlen<=1e-9) throw new Error("Geometry signal face binding world normal must be non-zero.");
    weightedNormal=[
      weightedNormal[0]+face.world_normal[0]/nlen*area,
      weightedNormal[1]+face.world_normal[1]/nlen*area,
      weightedNormal[2]+face.world_normal[2]/nlen*area,
    ];
    totalArea+=area;
    if(face.cavity) cavity_regions.push({...r});
    if(face.contact) contact_regions.push({...r});
  }
  const world_normal=totalArea>0
    ? [weightedNormal[0]/totalArea,weightedNormal[1]/totalArea,weightedNormal[2]/totalArea] as [number,number,number]
    : undefined;
  return {
    width:input.width,
    height:input.height,
    ...(input.edge_falloff!==undefined?{edge_falloff:input.edge_falloff}:{}),
    ...(cavity_regions.length?{cavity_regions}:{}),
    ...(contact_regions.length?{contact_regions}:{}),
    ...(world_normal?{world_normal}:{}),
    ...(input.lower_grime_power!==undefined?{lower_grime_power:input.lower_grime_power}:{}),
  };
}
