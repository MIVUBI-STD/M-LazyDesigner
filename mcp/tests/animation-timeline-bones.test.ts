import {test,expect} from "bun:test";
import {registerAnimationTools} from "@/server/tools/animation";
import {getAllToolDefinitions} from "@/lib/factories";

test("timeline expansion includes keyed descendants and collapse preserves unrelated rows and keys",async()=>{
  const g=globalThis as any;
  const previous=Object.fromEntries(["Group","AnimationItem","Timeline","updateKeyframeSelection"].map(k=>[k,g[k]]));
  class Bone { static all:Bone[]=[];children:Bone[]=[];name:string;constructor(public uuid:string){this.name=uuid;Bone.all.push(this);}}
  const root=new Bone("root"),child=new Bone("child"),empty=new Bone("empty");new Bone("other");root.children=[child,empty];
  g.Group=Bone;g.Timeline={animators:[]};g.updateKeyframeSelection=()=>{};
  const make=(bone:Bone,keys:number)=>({uuid:bone.uuid,keyframes:Array(keys).fill({time:0}),addToTimeline(){if(!g.Timeline.animators.includes(this))g.Timeline.animators.push(this);}});
  const animators=Object.fromEntries(Bone.all.map(b=>[b.uuid,make(b,b===empty?0:1)]));
  const animation={uuid:"clip",name:"clip",animators};
  g.AnimationItem={selected:animation,all:[animation]};g.Timeline.animators=[animators.other];
  try{
    if(!getAllToolDefinitions().animation_timeline)registerAnimationTools();
    const tool=getAllToolDefinitions().animation_timeline;
    const run=async(action:string,bone_ids=["root"])=>tool.execute(await tool.parameterSchema.parseAsync({action,bone_ids,animation_id:"clip"}));
    await run("expand_bones");await run("expand_bones");
    expect(g.Timeline.animators.map((a:any)=>a.uuid)).toEqual(["other","root","child"]);
    await expect(run("collapse_bones",["missing"])).rejects.toThrow();
    expect(g.Timeline.animators).toHaveLength(3);
    await run("collapse_bones");expect(g.Timeline.animators).toEqual([animators.other]);
    expect(animators.root.keyframes).toHaveLength(1);expect(animators.child.keyframes).toHaveLength(1);
  }finally{Object.assign(g,previous);}
});
