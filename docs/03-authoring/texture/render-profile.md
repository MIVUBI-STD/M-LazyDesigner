# Minecraft Entity Render Profile Standard

## Purpose

This document owns Minecraft Bedrock **entity render behavior**. It is deliberately separate from PBR Texture Sets, geometry material-instance metadata, and surface appearance patterns.

Never use the word `material` alone when the intended domain matters.

## Canonical namespaces

```text
render_profile              = LazyDesigner semantic intent for Minecraft entity rendering
minecraft_material_code     = literal Bedrock material code used by client entity/render controller
pbr_texture_set             = Blockbench PBR TextureGroup / Bedrock texture_set.json
geometry_material_instance  = per-face geometry material-instance metadata
surface_pattern             = visual pixel-language recipe such as wood_grain or brushed_metal
render_mode                 = existing Blockbench texture preview mode; NOT Minecraft render_profile
```

These domains must never be inferred from one another.

## Canonical render profiles

| render_profile | minecraft_material_code | primary semantic |
|---|---|---|
| `opaque` | `entity` | normal opaque entity rendering |
| `opaque_nocull` | `entity_nocull` | opaque with culling disabled |
| `cutout` | `entity_alphatest` | alpha-test/cutout transparency |
| `translucent` | `entity_alphablend` | blended translucency |
| `color_mask` | `entity_change_color` | alpha participates in color masking |
| `emissive_mask` | `entity_emissive` | alpha determines emissiveness |
| `emissive_translucent` | `entity_emissive_alpha` | emissive + transparent behavior, no culling |
| `emissive_translucent_one_sided` | `entity_emissive_alpha_one_sided` | emissive + transparent, culling enabled |
| `emissive_layer` | `entity_emissive_layer` | top texture layer is emissive |
| `glint` | `entity_glint` | glint effect |
| `cutout_glint` | `entity_alphatest_glint` | cutout + glint |
| `custom` | explicit authored code | semantics remain UNVERIFIED until externally proven |

Do not use `transparent` as a canonical profile. It is ambiguous between cutout and translucency.

## Conditional integration route

These retained APIs serve explicitly requested integration/compatibility work. Normal visual-asset authoring records render intent and checks its appearance without constructing an RP file graph.

`manage_render_profile` is the entity-render mutation boundary for Texturing. It is intentionally separate from `manage_material` (PBR) and `manage_material_instances` (geometry metadata).

```text
inspect client_entity material slots + render-controller assignments
→ decide render_profile per semantic bone/region cohort
→ manage_render_profile(operation=bind)
→ validate Material.<slot> references and ordered assignment result
→ verify texture/alpha treatment against that profile
→ runtime-specific claim remains UNVERIFIED until Minecraft runtime proof
```

The normal `bind` operation writes both halves of the relationship:

```text
client_entity.description.materials
  slot → minecraft_material_code

render_controller.materials
  bone pattern → Material.slot
```

Exact selector updates stay in their existing array position. A new selector is appended, which is appropriate for the common Bedrock pattern of a broad `*` default followed by narrower overrides. Complex/dynamic Molang material expressions are preserved and reported rather than rewritten into guessed static bindings.

## Render Contract Ledger

Before alpha-dependent styling is treated as complete, record the downstream render contract for each relevant slot/bone cohort:

```text
slot
→ render_profile
→ minecraft_material_code
→ alpha_semantics
→ texture-format requirement
→ assignment scope
→ verification state
```

Example:

```text
default → opaque → entity
windows → translucent → entity_alphablend
lamp    → emissive_mask → entity_emissive
```

One base-color atlas may contain regions consumed by different render profiles. Therefore alpha meaning is **zone-aware**, not automatically texture-wide.

## Alpha semantics

Alpha must never be interpreted from PNG/TGA pixels without a known downstream profile.

`analyzeRenderAwareAlpha` is the pure diagnostic owner. It reports alpha distribution through the resolved render contract; it never treats intermediate alpha as an error merely because the byte is between 0 and 255.

### Opaque

`entity` and `entity_nocull` do not give alpha a special LazyDesigner texture-authoring meaning. Non-opaque alpha is therefore a review candidate rather than an assumed transparency feature.

### Cutout

`entity_alphatest` uses alpha for transparency through alpha testing. For crisp Minecraft pixel art, intentional 0/255 alpha is preferred unless the target/reference requires otherwise. Intermediate alpha is a cutout-specific review candidate.

### Translucent

`entity_alphablend` enables blending. Intermediate alpha is valid and must not be flagged merely because it is not 0/255.

### Color mask

`entity_change_color` uses alpha as a color mask. Alpha is not ordinary transparency.

### Emissive mask

`entity_emissive` uses alpha to determine emissiveness and requires a TGA texture. Alpha is not ordinary opacity.

### Emissive translucent

`entity_emissive_alpha` and its one-sided variant combine emissive and transparent behavior. Their alpha must not be classified as simple transparency-only evidence.

### Emissive layer

`entity_emissive_layer` uses a two-layer PNG workflow. Treat the layer contract as the emissive source rather than inventing an alpha-mask rule.

## Material slots and assignments

Minecraft client entities define material shortnames, while render controllers apply `Material.<slot>` to bone patterns. LazyDesigner reasons in two layers:

```text
render_material_slots
  default → entity
  glass   → entity_alphablend
  lamp    → entity_emissive

render_material_assignments
  *       → default
  glass*  → glass
  lamp*   → lamp
```

Assignments are ordered. Later matching entries may intentionally override earlier broad assignments. Repeated exact patterns are therefore reported as ordered override evidence, not silently deduplicated.

## Custom materials

Unknown/custom material codes are allowed only as explicit authored values. LazyDesigner must preserve the code and return:

```text
render_profile = custom
alpha_semantics = unknown_custom
verification = unverified_custom
```

Do not guess custom shader/blend behavior from the material name.

## Blockbench preview boundary

The existing texture `render_mode` field (`default | emissive | additive | layered`) is a Blockbench/editor preview concern. It must not be used as proof that the exported Minecraft entity uses `entity_emissive`, `entity_alphablend`, or any other Bedrock material code.

Preview can support visual inspection; runtime material semantics still require the downstream Minecraft contract.

## PBR boundary

`manage_material`, `list_materials`, and `get_material_info` operate on Blockbench PBR TextureGroups / Bedrock `texture_set.json` data. Their semantic domain is `pbr_texture_set`.

PBR channels do not select Minecraft entity render materials:

```text
normal / height / MER / MERS
≠
entity / entity_alphatest / entity_alphablend / entity_emissive
```

## Geometry material-instance boundary

`manage_material_instances` operates on geometry face `material_name` metadata. Its semantic domain is `geometry_material_instance`.

It does not configure client-entity material shortnames or render-controller entity material assignment.

## Validation rules

- never infer `render_profile` from `surface_pattern`;
- never infer `render_profile` from PBR channels;
- never infer Minecraft material code from Blockbench `render_mode`;
- never interpret intermediate alpha without the render contract;
- one atlas may contain multiple alpha semantics through different bone/render assignments;
- unknown/custom material behavior remains UNVERIFIED;
- visual PASS still requires current mapped model evidence and, for runtime-specific claims, Minecraft runtime proof.
