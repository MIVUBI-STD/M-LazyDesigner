export type PbrIntentKind="PAINTED_METAL"|"BARE_METAL"|"WOOD"|"FABRIC"|"PLASTIC"|"STONE"|"EMISSIVE";

export type PbrIntent={
  kind:PbrIntentKind;
  name:string;
  color_value?:[number,number,number,number];
  emissive_strength?:number;
  roughness?:number;
  metalness?:number;
  subsurface?:number;
};

function byte(value:number,label:string):number{
  if(!Number.isFinite(value)||value<0||value>1) throw new Error(label+" must be within 0..1.");
  return Math.round(value*255);
}

export function compilePbrIntent(intent:PbrIntent){
  if(!intent.name.trim()) throw new Error("PBR intent requires a non-empty material name.");
  const defaults:Record<PbrIntentKind,{m:number;e:number;r:number;s:number}>={
    PAINTED_METAL:{m:0.75,e:0,r:0.45,s:0},
    BARE_METAL:{m:1,e:0,r:0.3,s:0},
    WOOD:{m:0,e:0,r:0.65,s:0},
    FABRIC:{m:0,e:0,r:0.85,s:0.05},
    PLASTIC:{m:0,e:0,r:0.4,s:0},
    STONE:{m:0,e:0,r:0.9,s:0},
    EMISSIVE:{m:0,e:1,r:0.5,s:0},
  };
  const d=defaults[intent.kind];
  return {
    name:intent.name,
    ...(intent.color_value?{color_value:intent.color_value}:{}),
    mer_value:[
      byte(intent.metalness ?? d.m,"metalness"),
      byte(intent.emissive_strength ?? d.e,"emissive"),
      byte(intent.roughness ?? d.r,"roughness"),
    ] as [number,number,number],
    subsurface_value:byte(intent.subsurface ?? d.s,"subsurface"),
  };
}
