import {z} from "zod";

export const animationEasingSchema=z.object({
  curve:z.enum(["sine","quad","cubic"]),
  direction:z.enum(["in","out","in_out"]),
  replace_existing:z.boolean().default(false),
}).strict().describe("Minecraft Bedrock Entity (bedrock) only. Whole-clip Molang time remapping. Reapply after changing clip length or loop mode. Existing Molang requires replace_existing=true.");

export function buildAnimationEasing(id:string,duration:number,loop:string,options:z.infer<typeof animationEasingSchema>):string {
  if(!Number.isFinite(duration)||duration<=0)throw new Error("Easing requires a positive finite animation length.");
  if(!["once","hold","loop"].includes(loop))throw new Error("Unsupported animation loop mode.");
  const clock=`v.blockit_ease_${Array.from(id,c=>c.codePointAt(0)!.toString(16)).join("_")}`;
  const t="t.blockit_ease_t";
  const power=options.curve==="quad"?2:3;
  let expression:string;
  if(options.curve==="sine"){
    expression=options.direction==="in"?`1-math.cos(${t}*90)`:
      options.direction==="out"?`math.sin(${t}*90)`:`(1-math.cos(${t}*180))/2`;
  }else{
    const pow=(v:string)=>`math.pow(${v},${power})`;
    expression=options.direction==="in"?pow(t):options.direction==="out"?`1-${pow(`1-${t}`)}`:
      `${t}<0.5?${pow(`2*${t}`)}/2:1-${pow(`2-2*${t}`)}/2`;
  }
  const advance=`${clock}=(${clock}??0)+q.delta_time;`;
  const bound=loop==="loop"?`${clock}=math.mod(${clock},${duration});`:
    loop==="once"?`${clock}>${duration}?{return ${duration+0.1};};`:"";
  return `q.anim_time==0?{${clock}=0;};${advance}${bound}${t}=math.clamp(${clock}/${duration},0,1);return (${expression})*${duration};`;
}
