import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { SemanticSelection } from "@/lib/authoringRecipe/selection";
import { selectCompiledPlacements } from "@/lib/authoringRecipe/selection";
import type { SemanticGeometryOperation } from "@/lib/authoringRecipe/semanticEdit";
import { rewriteAuthoringRecipeForSemanticEdit } from "@/lib/authoringRecipe/semanticRewrite";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";

export type SemanticOperationStackEntry={
  id:string;
  enabled?:boolean;
  selection:SemanticSelection;
  operation:SemanticGeometryOperation;
};

export type SemanticOperationStack={
  id:string;
  operations:readonly SemanticOperationStackEntry[];
};

export function evaluateSemanticOperationStack(
  base:AuthoringRecipe,
  stack:SemanticOperationStack
){
  if(!stack.id.trim()) throw new Error("Semantic operation stack requires non-empty id.");
  const seen=new Set<string>();
  let current=structuredClone(base);
  const receipts:Array<{id:string;affected_instance_ids:string[];skipped:boolean}>=[];
  for(const entry of stack.operations){
    if(!entry.id.trim()||seen.has(entry.id)) throw new Error("Semantic operation stack entry IDs must be non-empty and unique.");
    seen.add(entry.id);
    if(entry.enabled===false){receipts.push({id:entry.id,affected_instance_ids:[],skipped:true});continue;}
    const compiled=compileAuthoringRecipe(current);
    const selected=selectCompiledPlacements(compiled,entry.selection);
    if(selected.length===0) throw new Error("SEMANTIC_STACK_SELECTION_EMPTY: operation "+entry.id+" matched no instances.");
    const ids=selected.map((placement)=>placement.id).sort();
    current=rewriteAuthoringRecipeForSemanticEdit(current,{
      target:{instance_ids:ids},
      operation:entry.operation,
    });
    receipts.push({id:entry.id,affected_instance_ids:ids,skipped:false});
  }
  return {
    recipe:current,
    receipts,
    rebuild:planIncrementalRecipeRebuild(base,current),
  };
}
