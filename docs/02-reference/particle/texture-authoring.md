# Particle Texture, Atlas, UV and Material Authoring

This file owns the **complete particle-texture authoring contract** for ChatGPT-side Bedrock/Snowstorm particle work. Rendering behavior belongs partly to `appearance-rendering.md`; this file goes deeper into production texture construction, atlas design, UV/flipbook mapping, alpha, material choice, and QA.

## Evidence classes

- **OFFICIAL BEDROCK** — Microsoft particle/material/UV documentation.
- **SNOWSTORM / WINTERSKY** — editor/preview behavior.
- **EMPIRICALLY VERIFIED** — reproduced accepted project behavior.
- **HEURISTIC** — production guidance.

## 1. Texture path and file role

A particle effect references a texture through `description.basic_render_parameters.texture`.

Typical resource-pack path:

```text
textures/particle/effect_name.png
```

The JSON reference omits the file extension:

```json
"texture": "textures/particle/effect_name"
```

The file path and JSON texture reference must agree exactly.

## 2. RGBA foundation

For transparent particles, production textures should use genuine RGBA transparency.

Do not bake:
- checkerboard previews;
- white/gray presentation backgrounds;
- matte halos around sprites;
- screenshot artifacts;
- editor UI into the source texture.

Transparent pixels should be transparent in the actual alpha channel.

## 3. Alpha semantics

Alpha controls visibility, but the final appearance also depends on the selected particle material.

### `particles_opaque`
Use for fully opaque sprites.

### `particles_alpha`
Use for alpha/cutout-oriented particle rendering where crisp edge behavior is desired.

### `particles_blend`
Use for translucent color blending: smoke, cloud, mist, soft energy.

### `particles_add`
Use for glow-like additive content: sparks, magical energy, bright flashes.

**HEURISTIC:** Material choice should follow the intended blend behavior, not the visual category name alone.

## 4. Premultiplied/matte risk

Even when a PNG has transparency, edge RGB can create visible fringes under blending.

Avoid:
- white RGB in mostly transparent edge pixels for dark smoke;
- black fringe around bright additive content when not intended;
- inconsistent matte colors between atlas frames.

QA should inspect edge pixels against the intended material/background behavior.

## 5. Sprite canvas strategy

Choose canvas resolution from required detail, not by defaulting to maximum size.

Common practical classes:

```text
small static sprite
small/medium flipbook
multi-class atlas
large cinematic plume atlas
```

A larger source image does not automatically improve in-game quality if the billboard is small or viewed from far away.

## 6. Visible-bounds normalization

For related atlas cells or flipbook frames, keep visible content consistently framed.

If one cell touches the edge and another has large empty margins, frame changes can look like scale jitter even when billboard size is constant.

Normalize:
- sprite center;
- visible extents;
- padding;
- silhouette scale;
- intended animation pivot.

## 7. Safe gutter

Leave transparent padding around visible pixels so neighboring atlas cells cannot visually bleed into each other when UV interpolation/filtering occurs.

The correct gutter depends on resolution and filtering behavior; use a conservative gutter and verify visually.

For pixel-art atlases, keep cell boundaries exact and avoid accidental cross-cell colored pixels.

## 8. Atlas layout

Use an atlas when multiple related sprite classes or flipbook frames share one texture.

Examples:

```text
4 × 4 atlas
8 × 2 strip
two-row class atlas
single-row flipbook
```

Document:
- full texture width/height;
- cell width/height;
- grid columns/rows;
- frame/class mapping;
- any unused cells.

## 9. UV coordinate model

Bedrock billboard UV supports explicit `texture_width` and `texture_height`.

With actual texture dimensions specified, UV coordinates can be authored in texel-like units.

Example mental model:

```text
texture 512 × 512
cell 128 × 128
cell (column 2, row 1)
→ UV origin around [256, 128]
→ UV size [128, 128]
```

Always verify actual JSON field semantics against the target component schema.

## 10. Static UV selection

Use explicit `uv` and `uv_size` for a static atlas region.

These fields may accept Molang, which enables stable per-particle class selection.

Preferred class ownership:

```text
particle_random_1 chooses class
→ UV cell remains stable for particle lifetime
```

Avoid emitter-age-driven UV class switching unless the effect intentionally changes every living particle simultaneously.

## 11. Flipbook

Official billboard flipbook controls include:

```text
base_UV
size_UV
step_UV
frames_per_second
max_frame
stretch_to_lifetime
loop
```

### `base_UV`
Upper-left starting patch.

### `size_UV`
Frame size.

### `step_UV`
How far UV moves per frame.

### `frames_per_second`
Nominal frame rate.

### `max_frame`
Maximum frame count/index contract; verify against current schema/tool interpretation.

### `stretch_to_lifetime`
Adjust playback to particle lifetime.

### `loop`
Repeat animation after end.

Use flipbook for texture-frame animation, not for physical particle motion.

## 12. Flipbook design rules

For a non-looping explosion:
- frames should progress from birth to dissipation;
- frame count should match intended lifetime/readability;
- final frame should fade/resolve cleanly.

For looping ambient sprites:
- first and last frame must transition without obvious jump;
- avoid luminance discontinuities;
- keep silhouette center stable.

## 13. Tint-compatible texture design

If JSON tinting will drive color, author the base texture to accept tint cleanly.

Common strategies:
- neutral grayscale/value texture for broad recoloring;
- warm base values when only small hue shifts are needed;
- separate luminous and dark shapes when additive output requires controlled intensity.

Do not bake color variation into every frame if Molang tint is intended to own it.

## 14. Alpha-compatible texture design

For smoke/mist:
- use soft alpha transitions only where the style requires them;
- avoid excessive low-alpha haze filling the whole cell;
- preserve readable silhouette at target distance.

For crisp pixel-art particles:
- use deliberate hard/stepped alpha;
- avoid accidental antialiasing from image resizing;
- keep pixel clusters intentional.

## 15. Pixel-art authoring

For Minecraft-like pixel art:

```text
hard silhouette
limited palette
intentional clusters
controlled dithering
minimal/no blur
nearest-neighbor scaling during editing
```

Do not confuse a high-resolution atlas with smooth/blurred art. A 512 atlas can still contain intentionally crisp pixel-art cells.

## 16. Smoke/plume texture classes

Useful authored cell families:

```text
dense dark core
mid-gray body
soft edge/billow
ash fragment
hot gas/fire core
```

Do not make all smoke cells identical circles. Silhouette variety improves layered volume.

## 17. Debris/rock texture classes

Useful classes:

```text
cold dark rock
mild crack glow
hot fragment
small angular fragment
```

Keep the majority physically plausible for the effect; glowing variants should not accidentally turn all debris into fireballs unless requested.

## 18. Fire/spark texture classes

Separate responsibilities:
- flame body;
- ember/spark;
- hot core;
- fading trail if needed.

Additive materials can make small bright pixels extremely strong, so author intensity conservatively.

## 19. Mist/water texture classes

Mist usually needs low-contrast translucent sprites with irregular edges.

Avoid a uniform white circle atlas; it produces obvious stacked discs.

For droplets/splash frames, flipbook can be more appropriate than one static sprite.

## 20. Atlas mapping contract

Before authoring JSON, define a table such as:

```text
cell 0 = dense smoke A
cell 1 = dense smoke B
cell 2 = mid smoke A
...
```

Then JSON class selection should map explicitly to those cells.

This prevents texture and Molang logic from drifting apart.

## 21. Duplicate-cell policy

Exact duplicate cells are acceptable only when intentional.

Unintentional duplicates waste atlas space and reduce visual variety.

Static QA may hash cells to detect exact duplicates; visual near-duplicates still need human/vision review.

## 22. Transparent-border QA

For each atlas cell:
- inspect minimum transparent margin;
- confirm visible content does not cross cell boundary;
- confirm no colored pixel remains in supposedly empty gutter;
- confirm flipbook frame extents are stable.

## 23. White-matte QA

A near-neutral white/gray fringe can indicate:
- background-removal residue;
- antialiasing against white;
- baked presentation background.

White itself is not an error; legitimate white particles exist. Treat detection as a warning requiring semantic review.

## 24. Texture dimension QA

Check:

```text
actual PNG width/height
JSON texture_width/texture_height
cell dimensions
grid divisibility
UV origins
UV sizes
flipbook steps
```

All must agree.

## 25. Snowstorm texture workflow

**SNOWSTORM / WINTERSKY**

Snowstorm supports texture-oriented editing/preview workflows and is useful for quick UV/flipbook validation.

However:
- editor preview is not Minecraft runtime proof;
- release-specific rendering changes can affect apparent alpha/material behavior;
- texture correctness must still be verified from source files and in target runtime when material.

## 26. Generated-image cleanup

When a texture is generated from an illustration/image model:

```text
generated concept/image
→ isolate sprite
→ remove presentation background
→ enforce true RGBA
→ resize with correct filter
→ normalize visible bounds
→ place into atlas cell
→ QA alpha/gutter/cell mapping
```

Never use a presentation sheet directly as a production atlas.

## Pixel Art texture intake boundary

When a texture/frame asset comes from `lazydesigner-pixel-art-authoring`, treat it as visual resource evidence only.

Consume only texture-facing facts that can change rendering:

```text
texture identity
pixel dimensions
alpha behavior
frame count/order
frame dimensions when known
visual loop intent
color/emissive intent
style_lock_id when relevant
source/reference identity
known blockers
provenance class
```

Never import Particle behavior from Pixel Art:

```text
spawn rate
lifetime
velocity
emitter shape
Molang
collision
event behavior
locator semantics
performance/FPS claims
```

Preserve `USER_REQUIREMENT | REFERENCE_SUPPORTED | EXISTING_STYLE_SUPPORTED | PROVISIONAL`. If the supplied visual asset cannot satisfy a real particle texture requirement (for example frame layout, alpha behavior, gutter, or flipbook framing), return only that bounded visual requirement to Pixel Art; Particle retains emitter/lifecycle/motion/event ownership.

## 27. Texture QA checklist

```text
[ ] correct source path and filename
[ ] JSON texture reference matches
[ ] true RGBA transparency where needed
[ ] no baked checkerboard/background
[ ] no unintended matte halo
[ ] correct material for blend goal
[ ] correct texture dimensions
[ ] atlas grid divides exactly
[ ] UV origin/size in bounds
[ ] flipbook base/step/frame count valid
[ ] safe transparent gutter
[ ] visible bounds consistent across related cells
[ ] duplicate cells intentional
[ ] tint ownership matches base-texture design
[ ] target-distance readability considered
[ ] Snowstorm preview reviewed when useful
```

## Sources

- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftparticle_appearance_billboard?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_appearance_billboard_flipbook_data?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/uv_proxy?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_appearance_tinting?view=minecraft-bedrock-stable
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/materials?view=minecraft-bedrock-experimental
- https://learn.microsoft.com/en-us/minecraft/creator/documents/particleeffects?view=minecraft-bedrock-stable
