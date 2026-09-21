import type { MotionVec3 } from "@/lib/animation/motionRecipe";

export type CurveKind = "LINEAR" | "EASE_IN" | "EASE_OUT" | "EASE_IN_OUT" | "SMOOTHSTEP";

function curveT(kind: CurveKind, t: number): number {
  if (kind === "LINEAR") return t;
  if (kind === "EASE_IN") return t * t;
  if (kind === "EASE_OUT") return 1 - (1 - t) * (1 - t);
  if (kind === "SMOOTHSTEP") return t * t * (3 - 2 * t);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function sampleVec3Curve(
  from: MotionVec3,
  to: MotionVec3,
  start: number,
  end: number,
  interval: number,
  kind: CurveKind
): Array<{time:number; value:MotionVec3}> {
  if (![start,end,interval].every(Number.isFinite) || interval <= 0 || end < start) {
    throw new Error("Curve sampling requires finite start/end and a positive interval.");
  }
  const samples:Array<{time:number;value:MotionVec3}> = [];
  const span=end-start;
  if(span===0) return [{time:start,value:[...to]}];
  const count=Math.max(1,Math.ceil(span/interval));
  for(let i=0;i<=count;i+=1){
    const time=i===count?end:start+(span*i/count);
    const t=curveT(kind,(time-start)/span);
    samples.push({
      time,
      value:[
        from[0]+(to[0]-from[0])*t,
        from[1]+(to[1]-from[1])*t,
        from[2]+(to[2]-from[2])*t,
      ],
    });
  }
  return samples;
}
