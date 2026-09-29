import {z} from "zod";
import tinycolor from "tinycolor2";

export const texturePaletteParameters = z.object({
  base: z.string().regex(/^#[0-9a-f]{6}$/i, "Opaque #RRGGBB base color required."),
  count: z.number().int().min(3).max(31).refine(count=>count%2===1,"Use an odd count to retain the exact base in the middle.").default(7),
  shadow_lightness: z.number().min(0).max(1).default(.25).describe("HSL lightness decrease from base."),
  highlight_lightness: z.number().min(0).max(1).default(.25).describe("HSL lightness increase from base."),
  shadow_hue_shift: z.number().min(-180).max(180).default(-15),
  highlight_hue_shift: z.number().min(-180).max(180).default(15),
  saturation_falloff: z.number().min(0).max(1).default(.15),
  mode: z.enum(["preview","append","replace"]).default("preview").describe("Preview returns colors only; append/replace changes the native palette, never texture pixels."),
}).strict();

export function generateTexturePalette(input:z.infer<typeof texturePaletteParameters>){
  const {h,s,l}=tinycolor(input.base).toHsl();
  const middle=(input.count-1)/2;
  const colors=Array.from({length:input.count},(_,index)=>{
    if(index===middle)return input.base.toLowerCase();
    const shadow=index<middle, weight=Math.abs(index-middle)/middle;
    return tinycolor({
      h:((h+weight*(shadow?input.shadow_hue_shift:input.highlight_hue_shift))%360+360)%360,
      s:s*(1-input.saturation_falloff*weight),
      l:Math.max(0,Math.min(1,l+weight*(shadow?-input.shadow_lightness:input.highlight_lightness))),
    }).toHexString();
  });
  return {colors,base_index:middle,unique_colors:new Set(colors).size};
}
