import {test,expect} from "bun:test";
import {Mesh,PlaneGeometry,MeshBasicMaterial,Texture as ThreeTexture,Group} from "three";
import {bakeNativeCubeAo} from "@/lib/cubeAoRuntime";
import {registerPaintTextureTransactionTool} from "@/server/tools/paint-texture-transaction";
import {getAllToolDefinitions} from "@/lib/factories";
import {computeTextureRevision} from "@/lib/textureRevision";
test("AO adapter and transaction preserve revision, target and Undo boundaries",async()=>{
  const g=globalThis as any,previous=Object.fromEntries(["Format","Cube","Texture","Project","Undo","Canvas"].map(k=>[k,g[k]]));
  const map=new ThreeTexture(),material=new MeshBasicMaterial({map});map.updateMatrix();
  const mesh=new Mesh(new PlaneGeometry(1,1),material),parent=new Group();parent.rotation.y=.5;parent.add(mesh);
  const ceiling=new Mesh(new PlaneGeometry(20,20),new MeshBasicMaterial());ceiling.position.z=1;parent.add(ceiling);
  const cube={uuid:"a",name:"a",visibility:true,mesh};
  g.Format={id:"bedrock"};g.Cube={all:[cube,{uuid:"b",name:"b",visibility:true,mesh:ceiling}]};
  try{
    const pixels=new Uint8ClampedArray(16).fill(200);
    const options={cube_ids:["a"],radius:3,samples:32,bias:.001,strength:.5};
    const result=bakeNativeCubeAo({material} as any,pixels,2,2,options);
    expect(result.pixel_writes).toBe(4);expect(result.pixels[0]).toBeLessThan(200);expect(result.pixels[3]).toBe(200);
    let bitmap=new Uint8ClampedArray(pixels),snapshot=new Uint8ClampedArray(pixels),started=0,finished=0,cancelled=0,corrupt=false;
    const texture={uuid:"atlas",name:"atlas",material,layers_enabled:false,canvas:{width:2,height:2},
      ctx:{getImageData:()=>({data:bitmap})},
      edit(callback:any){callback(null,{ctx:{createImageData:()=>({data:new Uint8ClampedArray(16)}),putImageData:(image:any)=>{bitmap=new Uint8ClampedArray(image.data);if(corrupt)bitmap[0]=255;}}});},select(){}};
    g.Project={textures:[texture]};g.Texture={all:[texture],selected:texture};g.Canvas={updateAll(){}};
    g.Undo={initEdit(aspects:any){expect(aspects.textures).toEqual([texture]);snapshot=new Uint8ClampedArray(bitmap);started++;},finishEdit(){finished++;},cancelEdit(){bitmap=snapshot;cancelled++;}};
    if(!getAllToolDefinitions().paint_texture_transaction)registerPaintTextureTransactionTool();
    const tool=getAllToolDefinitions().paint_texture_transaction;
    const revision=await computeTextureRevision(bitmap,2,2);
    const run=async(expected_revision:string)=>tool.execute(await tool.parameterSchema.parseAsync({texture_id:"atlas",expected_revision,ambient_occlusion:options}));
    const receipt:any=await run(revision);expect(started).toBe(1);expect(finished).toBe(1);
    expect(receipt.structuredContent.revision.after).toBe(await computeTextureRevision(bitmap,2,2));
    await expect(run(revision)).rejects.toThrow("changed since");expect(started).toBe(1);
    const current=await computeTextureRevision(bitmap,2,2);corrupt=true;
    await expect(run(current)).rejects.toThrow("postcondition mismatch");expect(cancelled).toBe(1);expect(finished).toBe(1);
    expect(await computeTextureRevision(bitmap,2,2)).toBe(current);
    g.Format={id:"free"};expect(()=>bakeNativeCubeAo({material} as any,pixels,2,2,options)).toThrow("Bedrock");
  }finally{Object.assign(g,previous);mesh.geometry.dispose();ceiling.geometry.dispose();material.dispose();}
});
