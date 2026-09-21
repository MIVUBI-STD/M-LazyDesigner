import type { AuthoringRecipe, RecipeVec3 } from "@/lib/authoringRecipe/contracts";
import {
  composeAuthoringComponents,
  type RecipeComponentDefinition,
  type RecipeComponentInstance,
  type RecipePatternOverride,
} from "@/lib/authoringRecipe/components";

export type AuthoringAssetDefinition={
  id:string;
  name:string;
  version:number;
  component:RecipeComponentDefinition;
  tags?:readonly string[];
};

export type AuthoringAssetInstance={
  id:string;
  asset_id:string;
  translation?:RecipeVec3;
  pattern_overrides?:RecipePatternOverride[];
};

export function instantiateAuthoringAssets(
  root:Pick<AuthoringRecipe,"schema"|"compiler_version"|"id"|"name">,
  definitions:readonly AuthoringAssetDefinition[],
  instances:readonly AuthoringAssetInstance[]
):AuthoringRecipe{
  const byId=new Map(definitions.map((definition)=>[definition.id,definition]));
  if(byId.size!==definitions.length) throw new Error("Authoring assets require unique IDs.");
  const componentDefinitions:RecipeComponentDefinition[]=definitions.map((definition)=>{
    if(!definition.id.trim()||!definition.name.trim()||!Number.isInteger(definition.version)||definition.version<1){
      throw new Error("Authoring asset definitions require non-empty identity and positive integer version.");
    }
    return {
      id:definition.id,
      name:definition.name,
      recipe:structuredClone(definition.component.recipe),
    };
  });
  const componentInstances:RecipeComponentInstance[]=instances.map((instance)=>{
    const asset=byId.get(instance.asset_id);
    if(!asset) throw new Error("Authoring asset instance "+instance.id+" references unknown asset "+instance.asset_id+".");
    return {
      id:instance.id,
      component_id:asset.id,
      ...(instance.translation?{translation:[...instance.translation] as RecipeVec3}:{}),
      ...(instance.pattern_overrides?{pattern_overrides:instance.pattern_overrides.map((entry)=>structuredClone(entry))}:{}),
    };
  });
  return composeAuthoringComponents(root,componentDefinitions,componentInstances);
}
