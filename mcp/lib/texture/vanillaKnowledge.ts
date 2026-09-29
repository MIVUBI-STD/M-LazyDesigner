export const VANILLA_TEXTURE_KNOWLEDGE = Object.freeze({
  domain: "vanilla_texture_knowledge" as const,
  principles: [
    "A normal Bedrock entity uses one base-color atlas; material/render differences do not imply separate base atlases.",
    "Minecraft-readable texture styling favors intentional hard pixel clusters, coherent value/hue ramps, and form readability over random noise.",
    "Surface appearance and Minecraft render behavior are separate decisions: a glass-looking pattern does not imply translucency and a bright RGB region does not imply emissive rendering.",
    "Alpha meaning comes from the bound Minecraft render material: cutout opacity, blended opacity, color mask, emissive mask, combined emissive/translucent behavior, or custom semantics.",
    "Render-controller material assignments are ordered; later matching bone selectors can override earlier assignments.",
    "A wildcard default material followed by narrower bone-pattern overrides is the standard readable entity pattern.",
    "Identity marks and material/form separation precede secondary microdetail.",
    "Directional texture cues follow construction or form where evidence supports directionality; they are not universal noise fields.",
  ],
  reference_sources: [
    {
      name: "Minecraft Creator materials documentation",
      purpose: "Vanilla entity material codes, alpha/render semantics, and texture-format constraints.",
    },
    {
      name: "Minecraft Creator entity/render-controller documentation",
      purpose: "Client-entity material slots and ordered per-bone render-controller assignment behavior.",
    },
    {
      name: "Mojang Bedrock samples / cached Vanilla entity references",
      purpose: "Concrete entity resource structure and naming examples; reference only, never copied as an authored texture preset.",
    },
    {
      name: "Blockbench Minecraft Style Guide",
      purpose: "Pixel-cluster, palette, directional shading, and material-readability guidance.",
    },
  ],
  anti_patterns: [
    "copying an unrelated Vanilla texture as completion",
    "using one generic brightness ladder for every surface",
    "inferring render_profile from surface_pattern",
    "inferring emissive behavior from bright RGB alone",
    "treating all intermediate alpha as translucency",
    "adding high-frequency noise before material/form identity is established",
  ],
  runtime_network_required: false,
  copied_texture_assets_required: false,
});
