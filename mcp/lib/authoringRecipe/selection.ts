import type { CompiledAuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";

export type PlacementAxis="X"|"Y"|"Z";
export type PlacementPredicate=
  | {kind:"SEMANTIC_GROUP";equals:string}
  | {kind:"PROTOTYPE";equals:string}
  | {kind:"NAME_CONTAINS";value:string}
  | {kind:"AXIS_CENTER";axis:PlacementAxis;op:"LT"|"LTE"|"GT"|"GTE";value:number}
  | {kind:"AXIS_SIZE";axis:PlacementAxis;op:"LT"|"LTE"|"GT"|"GTE";value:number}
  | {kind:"DISTANCE_TO_POINT";point:[number,number,number];op:"LT"|"LTE";value:number}
  | {kind:"INSTANCE_INDEX";op:"EQ"|"EVEN"|"ODD";value?:number};

export type SemanticSelection={
  all?:readonly PlacementPredicate[];
  any?:readonly PlacementPredicate[];
  exclude?:readonly PlacementPredicate[];
};

const AXIS_INDEX={X:0,Y:1,Z:2} as const;
const MAX_SELECTION_PREDICATES=64;

function compare(value:number,op:"LT"|"LTE"|"GT"|"GTE",target:number){
  if(!Number.isFinite(target)) throw new Error("Selection numeric target must be finite.");
  if(op==="LT") return value<target;
  if(op==="LTE") return value<=target;
  if(op==="GT") return value>target;
  return value>=target;
}
function center(p:CompiledCubePlacement):[number,number,number]{
  return [(p.from[0]+p.to[0])/2,(p.from[1]+p.to[1])/2,(p.from[2]+p.to[2])/2];
}
function requireText(value:string,label:string){
  if(!value.trim()) throw new Error(label+" requires non-empty text.");
  return value;
}
function matches(p:CompiledCubePlacement,predicate:PlacementPredicate):boolean{
  if(predicate.kind==="SEMANTIC_GROUP") return p.semantic_group===requireText(predicate.equals,"SEMANTIC_GROUP predicate");
  if(predicate.kind==="PROTOTYPE") return p.prototype_id===requireText(predicate.equals,"PROTOTYPE predicate");
  if(predicate.kind==="NAME_CONTAINS") return p.name.toLowerCase().includes(requireText(predicate.value,"NAME_CONTAINS predicate").toLowerCase());
  if(predicate.kind==="AXIS_CENTER") return compare(center(p)[AXIS_INDEX[predicate.axis]],predicate.op,predicate.value);
  if(predicate.kind==="AXIS_SIZE"){
    const axis=AXIS_INDEX[predicate.axis];
    return compare(p.to[axis]-p.from[axis],predicate.op,predicate.value);
  }
  if(predicate.kind==="DISTANCE_TO_POINT"){
    const [x,y,z]=predicate.point;
    if(![x,y,z,predicate.value].every(Number.isFinite)||predicate.value<0) throw new Error("DISTANCE_TO_POINT predicate requires finite point and non-negative distance.");
    const c=center(p);
    const d=Math.hypot(c[0]-x,c[1]-y,c[2]-z);
    return predicate.op==="LT"?d<predicate.value:d<=predicate.value;
  }
  if(predicate.op==="EVEN") return p.instance_index%2===0;
  if(predicate.op==="ODD") return p.instance_index%2!==0;
  if(!Number.isInteger(predicate.value)||Number(predicate.value)<0) throw new Error("INSTANCE_INDEX EQ predicate requires non-negative integer value.");
  return p.instance_index===predicate.value;
}

export function selectCompiledPlacements(compiled:CompiledAuthoringRecipe,selection:SemanticSelection):CompiledCubePlacement[]{
  const all=selection.all??[];
  const any=selection.any??[];
  const exclude=selection.exclude??[];
  const total=all.length+any.length+exclude.length;
  if(all.length===0&&any.length===0) throw new Error("Semantic selection requires at least one all/any predicate.");
  if(total>MAX_SELECTION_PREDICATES) throw new Error("SEMANTIC_SELECTION_BUDGET_EXCEEDED: selection exceeds "+MAX_SELECTION_PREDICATES+" predicates.");
  return compiled.placements.filter((placement)=>{
    if(all.some((predicate)=>!matches(placement,predicate))) return false;
    if(any.length>0&&!any.some((predicate)=>matches(placement,predicate))) return false;
    if(exclude.some((predicate)=>matches(placement,predicate))) return false;
    return true;
  });
}
