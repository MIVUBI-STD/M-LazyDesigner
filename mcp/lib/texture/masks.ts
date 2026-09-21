export type ScalarMask = {
  width: number;
  height: number;
  values: Float32Array;
};

function requireMask(mask: ScalarMask): void {
  if (!Number.isInteger(mask.width) || mask.width <= 0 || !Number.isInteger(mask.height) || mask.height <= 0) {
    throw new Error("Mask dimensions must be positive integers.");
  }
  if (mask.values.length !== mask.width * mask.height) {
    throw new Error("Mask buffer length does not match dimensions.");
  }
}

export function edgeMask(width:number,height:number,falloff:number):ScalarMask{
  if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0) throw new Error("Edge mask dimensions must be positive integers.");
  if(!Number.isFinite(falloff)||falloff<=0) throw new Error("Edge mask falloff must be finite and positive.");
  const values=new Float32Array(width*height);
  for(let y=0;y<height;y+=1) for(let x=0;x<width;x+=1){
    const d=Math.min(x,y,width-1-x,height-1-y);
    values[y*width+x]=Math.max(0,Math.min(1,1-d/falloff));
  }
  return {width,height,values};
}

export function cavityMaskFromAlpha(rgba:Uint8Array,width:number,height:number,radius=1):ScalarMask{
  if(rgba.length!==width*height*4) throw new Error("RGBA buffer length does not match cavity mask dimensions.");
  if(!Number.isInteger(radius)||radius<1||radius>8) throw new Error("Cavity radius must be an integer within 1..8.");
  const values=new Float32Array(width*height);
  for(let y=0;y<height;y+=1) for(let x=0;x<width;x+=1){
    let total=0,count=0;
    for(let oy=-radius;oy<=radius;oy+=1) for(let ox=-radius;ox<=radius;ox+=1){
      const nx=x+ox, ny=y+oy;
      if(nx<0||ny<0||nx>=width||ny>=height) continue;
      total+=rgba[(ny*width+nx)*4+3]/255;
      count+=1;
    }
    const self=rgba[(y*width+x)*4+3]/255;
    values[y*width+x]=Math.max(0,Math.min(1,(total/Math.max(1,count))-self));
  }
  return {width,height,values};
}

export function combineMasks(a:ScalarMask,b:ScalarMask,mode:"MULTIPLY"|"MAX"|"MIN"):ScalarMask{
  requireMask(a); requireMask(b);
  if(a.width!==b.width||a.height!==b.height) throw new Error("Masks must share dimensions.");
  const values=new Float32Array(a.values.length);
  for(let i=0;i<values.length;i+=1){
    values[i]=mode==="MULTIPLY"?a.values[i]*b.values[i]:mode==="MAX"?Math.max(a.values[i],b.values[i]):Math.min(a.values[i],b.values[i]);
  }
  return {width:a.width,height:a.height,values};
}
