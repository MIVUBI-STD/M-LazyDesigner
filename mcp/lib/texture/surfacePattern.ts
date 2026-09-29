export const TEXTURE_SURFACE_PATTERN_NAMES = [
  "wood_grain",
  "painted_wood",
  "brushed_metal",
  "bare_metal",
  "painted_metal",
  "stone_cluster",
  "concrete_speckle",
  "cloth_weave",
  "leather_wear",
  "clean_glass",
  "dirty_glass",
  "plastic_clean",
  "rubber_matte",
  "organic_skin",
  "fur_cluster",
  "emissive_panel",
  "energy_surface",
] as const;

export type TextureSurfacePattern =
  (typeof TEXTURE_SURFACE_PATTERN_NAMES)[number];

export type TextureSurfacePatternRecipe = {
  domain: "surface_pattern";
  pattern: TextureSurfacePattern;
  directionality: "none" | "weak" | "directional" | "form_driven";
  cluster_language: string;
  value_behavior: string;
  edge_behavior: string;
  secondary_detail: string;
  avoid: readonly string[];
  render_profile_inference: "forbidden";
};

const recipe = (
  pattern: TextureSurfacePattern,
  directionality: TextureSurfacePatternRecipe["directionality"],
  cluster_language: string,
  value_behavior: string,
  edge_behavior: string,
  secondary_detail: string,
  avoid: readonly string[]
): TextureSurfacePatternRecipe => ({
  domain: "surface_pattern",
  pattern,
  directionality,
  cluster_language,
  value_behavior,
  edge_behavior,
  secondary_detail,
  avoid,
  render_profile_inference: "forbidden",
});

export const TEXTURE_SURFACE_PATTERN_RECIPES: Readonly<
  Record<TextureSurfacePattern, TextureSurfacePatternRecipe>
> = Object.freeze({
  wood_grain: recipe("wood_grain", "directional", "irregular elongated pixel runs following construction grain", "moderate stepped hue/value movement", "subdued except exposed cut edges", "sparse knots or grain interruptions", ["uniform stripes", "noise-first grain"]),
  painted_wood: recipe("painted_wood", "directional", "broad paint clusters with faint underlying grain", "paint color owns the ramp", "small exposed-edge contrast where reference supports wear", "rare chips or seams", ["bare-wood grain dominating paint", "random chipping"]),
  brushed_metal: recipe("brushed_metal", "weak", "clean hard clusters with restrained directional streaks", "controlled narrow-to-moderate value range", "crisp sparse highlight breaks", "rare brush marks or panel seams", ["stone-like speckle", "full-edge outlining"]),
  bare_metal: recipe("bare_metal", "form_driven", "clean hard clusters and deliberate value breaks", "stronger specular-style contrast where form supports it", "selective bright edge accents", "sparse seams, fasteners, or wear", ["random bright noise", "soft airbrush shading"]),
  painted_metal: recipe("painted_metal", "form_driven", "paint-dominant hard clusters", "paint hue/value ramp first", "metal exposure only at justified chips/edges", "panel seams and sparse wear", ["making every edge bare metal", "uniform scratch noise"]),
  stone_cluster: recipe("stone_cluster", "none", "irregular medium pixel islands", "broad local value variation", "broken rather than uniformly highlighted", "sparse inclusions or cracks", ["directional wood-like bands", "single-pixel salt-and-pepper noise"]),
  concrete_speckle: recipe("concrete_speckle", "none", "large quiet fields with sparse clustered inclusions", "low-to-moderate contrast", "mostly quiet", "controlled aggregate marks", ["dense uniform speckle", "high-frequency noise"]),
  cloth_weave: recipe("cloth_weave", "form_driven", "soft stepped clusters with subtle repeated cues", "restrained contrast following folds", "soft/subdued", "minimal weave hints at sufficient texel density", ["sharp metallic edge highlights", "checkerboard microtexture"]),
  leather_wear: recipe("leather_wear", "form_driven", "broad organic clusters", "moderate warm/cool or value variation", "selective crease/edge wear", "sparse creases and worn patches", ["even scratches", "stone-like mottling"]),
  clean_glass: recipe("clean_glass", "form_driven", "mostly quiet field with sparse reflection clusters", "value kept subordinate to transparency intent", "border/structural emphasis only when reference supports it", "few highlights/reflections", ["opaque-looking noise", "automatic translucency inference"]),
  dirty_glass: recipe("dirty_glass", "none", "quiet transparent field plus sparse dirt clusters", "low contrast contamination", "structural edge remains readable", "smudges/dust in grouped patches", ["uniform fog", "dense opaque dirt"]),
  plastic_clean: recipe("plastic_clean", "form_driven", "broad clean clusters", "simple controlled ramp", "small selective highlights", "very sparse manufacturing seams", ["metallic scratches", "grain/noise blanket"]),
  rubber_matte: recipe("rubber_matte", "form_driven", "broad dark clusters", "compressed low-value range", "subdued highlights", "sparse grooves or molded marks", ["bright sharp specular edges", "random grain"]),
  organic_skin: recipe("organic_skin", "form_driven", "organic clustered transitions", "form-led hue/value changes", "softened but pixel-crisp", "identity marks before microvariation", ["mechanical panel language", "uniform procedural spots"]),
  fur_cluster: recipe("fur_cluster", "directional", "layered tuft-like pixel clusters following growth direction", "moderate grouped value shifts", "broken tuft tips rather than outlines", "sparse tuft accents", ["single-pixel hair noise", "uniform stripes"]),
  emissive_panel: recipe("emissive_panel", "form_driven", "clean luminous core clusters with readable casing separation", "bright identity core with controlled surrounding values", "hard boundary between source and housing", "small internal segmentation", ["automatic glow from RGB alone", "full-surface white clipping"]),
  energy_surface: recipe("energy_surface", "directional", "purposeful flow/arc clusters", "high contrast concentrated in focal paths", "broken energetic accents", "sparse pulses/branches", ["random electric noise", "uniform glow"]),
});

export function getTextureSurfacePatternRecipe(
  pattern: TextureSurfacePattern
): TextureSurfacePatternRecipe {
  return TEXTURE_SURFACE_PATTERN_RECIPES[pattern];
}
