import { describe, expect, test } from "bun:test";
import {
  applyAnimationControllerVariableOperations,
  applyClientEntityAnimationRuntimeOperations,
  inspectAnimationControllerVariables,
  validateClientEntityAnimationDependencies,
} from "@/lib/bedrockAnimationRuntimeResources";
import type { JsonObject } from "@/lib/bedrockParticleDocument";
import {
  animationControllerVariableResourceParameters,
  clientEntityAnimationResourceParameters,
} from "@/server/tools/animation-runtime-resource-intelligence";
import { getCapabilityBranchFields } from "@/gateway/schemaProjection";

const clientEntity=():JsonObject=>({format_version:"1.10.0","minecraft:client_entity":{description:{identifier:"test:entity",geometry:{default:"geometry.test"},textures:{default:"textures/entity/test"},particle_effects:{dust:"test:dust"}}}});

describe("Bedrock animation runtime resources",()=>{
 test("client entity wiring preserves siblings and closes only reachable runtime effects",()=>{
  const doc=applyClientEntityAnimationRuntimeOperations(clientEntity(),[
   {op:"set_animation_mapping",shortname:"main",target:"controller.animation.test.main"},
   {op:"set_animation_mapping",shortname:"walk",target:"animation.test.walk"},
   {op:"set_animate",shortname:"main"},
   {op:"set_pre_animation_variable",name:"speed",expression:"q.modified_move_speed"},
   {op:"set_sound_binding",shortname:"step",sound:"mob.test.step"},
  ]);
  const description=(doc["minecraft:client_entity"] as JsonObject).description as JsonObject;
  expect(description.geometry).toEqual({default:"geometry.test"});
  expect(description.textures).toEqual({default:"textures/entity/test"});
  expect(description.particle_effects).toEqual({dust:"test:dust"});
  const graph=validateClientEntityAnimationDependencies(doc,{known_animation_items:["animation.test.walk","controller.animation.test.main","controller.animation.test.unrelated"],controller_links:[{owner_identifier:"controller.animation.test.main",aliases:["walk"]},{owner_identifier:"controller.animation.test.unrelated",aliases:[]}],effect_references:[{owner_identifier:"controller.animation.test.main",sounds:["step"],particles:["dust"]},{owner_identifier:"controller.animation.test.unrelated",sounds:["ghost"],particles:["ghost_particle"]}],variable_dependencies:["variable.speed"]});
  expect(graph.error_count).toBe(0); expect(graph.reachable_aliases).toEqual(["main","walk"]); expect(graph.unresolved_variable_candidates).toEqual([]);
 });

 test("dependency diagnostics catch unmapped runtime and explicitly scoped effect shortnames",()=>{
  const doc=clientEntity();
  const d=(doc["minecraft:client_entity"] as JsonObject).description as JsonObject;
  d.scripts={animate:["missing"]};
  const graph=validateClientEntityAnimationDependencies(doc,{sound_references:["step"],particle_references:["smoke"]});
  const codes=graph.diagnostics.map(x=>x.code);
  expect(codes).toContain("unmapped_animate_alias"); expect(codes).toContain("unbound_sound_shortname"); expect(codes).toContain("unbound_particle_shortname");
 });

 test("controller variables/remap curves are deterministic file-backed state",()=>{
  const source:JsonObject={format_version:"1.10.0",animation_controllers:{"controller.animation.test.main":{initial_state:"default",states:{default:{animations:["walk"],blend_transition:0.2}}}}};
  const doc=applyAnimationControllerVariableOperations(source,"controller.animation.test.main",[{op:"set_state_variable",state:"default",name:"move",input:"q.ground_speed",remap_curve:[{input:1,output:0.7},{input:0,output:0.2}]}]);
  const state=((((doc.animation_controllers as JsonObject)["controller.animation.test.main"] as JsonObject).states as JsonObject).default as JsonObject);
  expect(state.animations).toEqual(["walk"]); expect(state.blend_transition).toBe(0.2);
  expect(((state.variables as JsonObject).move as JsonObject).remap_curve).toEqual({"0":0.2,"1":0.7});
  const summary=inspectAnimationControllerVariables(doc,"controller.animation.test.main");
  expect(summary.variable_count).toBe(1); expect(summary.molang_analysis.dependencies.query).toContain("query.ground_speed");
 });

 test("existing controller tool resource branches retain strict bounded schemas",()=>{
  expect(clientEntityAnimationResourceParameters.safeParse({resource_kind:"client_entity",resource_source:{content:JSON.stringify(clientEntity())},resource_operations:[{op:"set_animation_mapping",shortname:"walk",target:"animation.test.walk"}]}).success).toBe(true);
  expect(animationControllerVariableResourceParameters.safeParse({resource_kind:"animation_controller",resource_source:{content:'{"animation_controllers":{"controller.animation.test":{"states":{"default":{}}}}}'},resource_controller:"controller.animation.test",resource_operations:[{op:"set_state_variable",state:"default",name:"speed",input:"q.ground_speed",remap_curve:[{input:0,output:0},{input:1,output:1}]}]}).success).toBe(true);
 });

 test("Gateway branch projection keeps advanced Animation schema usage bounded",async()=>{
  expect(getCapabilityBranchFields("manage_animation_controller",{field:"resource_kind",value:"client_entity"})).toEqual(["resource_kind","resource_source","resource_output","resource_operations","max_content_length"]);
  expect(getCapabilityBranchFields("manage_animation_timeline",{field:"operation",value:"properties"})).toContain("start_delay");
  const [server,extensions,source,skill]=await Promise.all([
    Bun.file("server/server.ts").text(),
    Bun.file("server/runtime/extensions.ts").text(),
    Bun.file("server/tools/animation-runtime-resource-intelligence.ts").text(),
    Bun.file("../.agents/skills/lazydesigner-animation/SKILL.md").text()
  ]);
  expect(server).toContain("initializeRuntimeCapabilityWiring");
  expect(extensions).toContain("wireAnimationRuntimeResourceIntelligence");
  expect(source).toContain('getAllToolDefinitions()["manage_animation_controller"]');
  expect(source).toContain('getAllToolDefinitions()["inspect_animation"]');
  expect(source).not.toContain("createTool(");
  expect(skill).toMatch(/`batch`.*operation="batch".*batch_operation=.*coherent cohort/);
 });
});
