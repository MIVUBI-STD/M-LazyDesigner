export type ScalarMask = {
  width: number;
  height: number;
  values: Float32Array;
};

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
