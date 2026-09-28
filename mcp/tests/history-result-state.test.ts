import {test,expect} from "bun:test";
import "@/server/tools";
import {getAllToolDefinitions} from "@/lib/factories";
import {
  recordSemanticHistoryEffect,
  semanticHistoryEffectForEntry,
} from "@/lib/semanticHistory";

test("undo and redo report only completed transitions and reject native no-effect",async()=>{
  const g=globalThis as any,old={Project:g.Project,Undo:g.Undo,Canvas:g.Canvas};
  g.Project={};g.Canvas={updateAll(){}};
  try{
    for(const direction of ["undo","redo"] as const){
      const initial=direction==="undo"?2:0,delta=direction==="undo"?-1:1;
      let calls=0;
      g.Undo={index:initial,history:[{action:"first"},{action:"second"}]};
      const tool=getAllToolDefinitions()[direction];
      const run=async(steps:number)=>tool.execute(await tool.parameterSchema.parseAsync({steps}));
      g.Undo[direction]=()=>{calls++;};
      await expect(run(1)).rejects.toThrow("did not move");
      expect(g.Undo.index).toBe(initial);
      g.Undo[direction]=()=>{if(calls++===1)throw new Error("native failure");g.Undo.index+=delta;};
      calls=0;
      await expect(run(2)).rejects.toThrow("1 completed step(s)");
      expect(calls).toBe(2);expect(g.Undo.index).toBe(initial+delta);
      g.Undo.index=initial;g.Undo[direction]=()=>{g.Undo.index+=delta;};
      const result=await run(2) as any;
      expect(result.structuredContent[direction==="undo"?"undone_count":"redone_count"]).toBe(2);
      expect(result.structuredContent.new_index).toBe(initial+2*delta);
      await expect(run(1)).rejects.toThrow("Nothing to");
      g.Undo.index=initial;g.Undo.current_save={};
      await expect(run(1)).rejects.toThrow("active Undo edit");
      expect(g.Undo.index).toBe(initial);
    }
  }finally{Object.assign(g,old);}
});


test("undo and redo expose semantic effect only when every traversed entry is annotated",async()=>{
  const g=globalThis as any,old={Project:g.Project,Undo:g.Undo,Canvas:g.Canvas};
  g.Project={};g.Canvas={updateAll(){}};
  try{
    const first={action:"geometry"};
    const second={action:"material"};
    g.Undo={index:2,history:[first,second]};
    g.Undo.undo=()=>{g.Undo.index-=1;};
    g.Undo.redo=()=>{g.Undo.index+=1;};
    recordSemanticHistoryEffect(first,["GEOMETRY_STRUCTURE"]);
    recordSemanticHistoryEffect(second,["MATERIAL_RENDER"]);

    const undo=getAllToolDefinitions().undo;
    const one=await undo.execute(await undo.parameterSchema.parseAsync({steps:1})) as any;
    expect(one.structuredContent.semantic_effect).toEqual({
      stale:["MATERIAL_RENDER"],
      workspace_projection:true,
      acceptance_gates:true,
    });

    g.Undo.index=2;
    const two=await undo.execute(await undo.parameterSchema.parseAsync({steps:2})) as any;
    expect(two.structuredContent.semantic_effect.stale.sort()).toEqual([
      "GEOMETRY_STRUCTURE","MATERIAL_RENDER"
    ]);

    const unknown={action:"unknown"};
    g.Undo={index:1,history:[unknown],undo(){this.index-=1;},redo(){this.index+=1;}};
    const fallback=await undo.execute(await undo.parameterSchema.parseAsync({steps:1})) as any;
    expect(fallback.structuredContent.semantic_effect).toBeNull();
  }finally{Object.assign(g,old);}
});


test("Geometry producers consume manifest-owned semantic scopes", async () => {
  const files = [
    ["server/tools/element-hierarchy.ts", ["add_group", "modify_group", "reparent_element"]],
    ["server/tools/element-mutation.ts", ["duplicate_element", "rename_element"]],
    ["server/tools/locators.ts", ["manage_locator", "manage_null_object"]],
  ] as const;

  for (const [path, capabilities] of files) {
    const source = await Bun.file(path).text();
    expect(source, path).toContain("recordCurrentCapabilitySemanticHistoryEffect");
    expect(source, path).not.toContain("recordCurrentSemanticHistoryEffect([");
    for (const capability of capabilities) {
      expect(source, `${path}: ${capability}`).toContain(
        `recordCurrentCapabilitySemanticHistoryEffect("${capability}")`
      );
    }
  }
});

test("remove_element history derives scopes from the removed element type", async () => {
  const source = await Bun.file("server/tools/element-mutation.ts").text();
  expect(source).toContain("removeElementSemanticScopes(removedRoot.type)");
  expect(source).toContain("recordCurrentSemanticHistoryEffect(");
  expect(source).not.toContain(
    'recordCurrentCapabilitySemanticHistoryEffect("remove_element")'
  );
});

test("semantic history distinguishes known empty effects from unknown entries",()=>{
  const known={action:"checkpoint"};
  recordSemanticHistoryEffect(
    known,
    [],
    {workspace_projection:false,acceptance_gates:false}
  );
  expect(semanticHistoryEffectForEntry(known)).toEqual({
    stale: [],
    workspace_projection: false,
    acceptance_gates: false,
  });
});
