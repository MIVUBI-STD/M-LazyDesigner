import type { Rgba } from "@/lib/texture/proceduralOps";

export type SurfacePattern =
  | { kind:"CHECKER"; cell:number; a:Rgba; b:Rgba }
  | { kind:"STRIPES"; axis:"x"|"y"; width:number; a:Rgba; b:Rgba }
  | { kind:"PANEL"; spacing_x:number; spacing_y:number; line_width:number; base:Rgba; line:Rgba };

function byte(v:number){return Math.max(0,Math.min(255,Math.round(v)));}
function setPixel(out:Uint8Array,width:number,x:number,y:number,color:Rgba){
  const p=(y*width+x)*4;
  out[p]=byte(color[0]);out[p+1]=byte(color[1]);out[p+2]=byte(color[2]);out[p+3]=byte(color[3]);
}
function requirePositiveInt(value:number,label:string){
  if(!Number.isInteger(value)||value<=0) throw new Error(label+" must be a positive integer.");
}

export function renderSurfacePattern(width:number,height:number,pattern:SurfacePattern):Uint8Array{
  requirePositiveInt(width,"Pattern width");requirePositiveInt(height,"Pattern height");
  const out=new Uint8Array(width*height*4);
  if(pattern.kind==="CHECKER"){
    requirePositiveInt(pattern.cell,"Checker cell");
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      setPixel(out,width,x,y,((Math.floor(x/pattern.cell)+Math.floor(y/pattern.cell))&1)===0?pattern.a:pattern.b);
    }
    return out;
  }
  if(pattern.kind==="STRIPES"){
    requirePositiveInt(pattern.width,"Stripe width");
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const coordinate=pattern.axis==="x"?x:y;
      setPixel(out,width,x,y,(Math.floor(coordinate/pattern.width)&1)===0?pattern.a:pattern.b);
    }
    return out;
  }
  requirePositiveInt(pattern.spacing_x,"Panel spacing_x");
  requirePositiveInt(pattern.spacing_y,"Panel spacing_y");
  requirePositiveInt(pattern.line_width,"Panel line_width");
  if(pattern.line_width>Math.min(pattern.spacing_x,pattern.spacing_y)){
    throw new Error("Panel line_width cannot exceed the smaller panel spacing.");
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const line=(x%pattern.spacing_x)<pattern.line_width||(y%pattern.spacing_y)<pattern.line_width;
    setPixel(out,width,x,y,line?pattern.line:pattern.base);
  }
  return out;
}
