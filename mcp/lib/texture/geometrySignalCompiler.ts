import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { GeometrySignalEvidence, TextureRect, WeightedTextureRect } from "@/lib/texture/geometrySignalBuilder";

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
  const upward_regions:WeightedTextureRect[]=[];
  for(const face of input.faces){
    if(!owned.has(face.instance_id)) throw new Error("Geometry signal face binding references unowned instance "+face.instance_id+".");
    const r=face.atlas_rect;
    if(![r.x,r.y,r.width,r.height,...face.world_normal].every(Number.isFinite)||r.width<=0||r.height<=0) throw new Error("Geometry signal face binding contains invalid rect or world normal.");
    if(r.x<0||r.y<0||r.x+r.width>input.width||r.y+r.height>input.height) throw new Error("Geometry signal face binding lies outside atlas bounds.");
    const nlen=Math.hypot(...face.world_normal);
    if(nlen<=1e-9) throw new Error("Geometry signal face binding world normal must be non-zero.");
    const upward=Math.max(0,Math.min(1,face.world_normal[1]/nlen));
    if(upward>0) upward_regions.push({...r,weight:upward});
    if(face.cavity) cavity_regions.push({...r});
    if(face.contact) contact_regions.push({...r});
  }
  return {
    width:input.width,
    height:input.height,
    ...(input.edge_falloff!==undefined?{edge_falloff:input.edge_falloff}:{}),
    ...(cavity_regions.length?{cavity_regions}:{}),
    ...(contact_regions.length?{contact_regions}:{}),
    ...(upward_regions.length?{upward_regions}:{}),
    ...(input.lower_grime_power!==undefined?{lower_grime_power:input.lower_grime_power}:{}),
  };
}
