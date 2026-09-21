export type TextureRect={x:number;y:number;width:number;height:number};

export function diffTextureRegion(
  before:Uint8Array,
  after:Uint8Array,
  width:number,
  height:number
):{changed:boolean;rect:TextureRect|null;changed_pixels:number}{
  if(before.length!==after.length||before.length!==width*height*4) throw new Error("Texture diff buffers must have equal RGBA dimensions.");
  let minX=width,minY=height,maxX=-1,maxY=-1,changedPixels=0;
  for(let y=0;y<height;y+=1) for(let x=0;x<width;x+=1){
    const p=(y*width+x)*4;
    let changed=false;
    for(let c=0;c<4;c+=1) if(before[p+c]!==after[p+c]){changed=true;break;}
    if(!changed) continue;
    changedPixels+=1;
    minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
  }
  return {
    changed:changedPixels>0,
    rect:changedPixels?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:null,
    changed_pixels:changedPixels,
  };
}
