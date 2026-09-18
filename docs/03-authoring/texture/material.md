# PBR Texture Set Standard

## Purpose

This document owns Blockbench PBR TextureGroups / Bedrock `texture_set.json` authoring. Its canonical domain name is:

```text
pbr_texture_set
```

Do not call this domain simply `material` when another material concept could be confused with it.

A normal Minecraft-style entity can remain on the single production color atlas with no PBR Texture Set at all. Create PBR only when the asset actually needs normal/height, metalness, emissive, roughness, or subsurface behavior.

## Naming boundary

LazyDesigner uses four separate namespaces:

```text
render_profile             = Minecraft entity render behavior/code
pbr_texture_set            = this document; normal/height/MER/MERS
geometry_material_instance = face material-instance metadata
surface_pattern            = visual pixel-language recipe
```

The existing public tool names `manage_material`, `list_materials`, and `get_material_info` are compatibility names. Their semantic domain is `pbr_texture_set`.

`manage_material_instances` is **not** part of this domain; it owns `geometry_material_instance`.

See:

- `11-render-profile-standard.md` for Minecraft transparency/glow/render-material semantics;
- `12-surface-pattern-standard.md` for wood/metal/cloth/etc. visual texture treatment.

## Canonical authoring route

```text
reuse known UUID/state; list_materials only if identity is unknown
  → get_material_info only if required state is missing/stale (skip for new material)
  → manage_material(create/configure/assign_channel)
  → list_textures validation
  → PBR preview / mapped model evidence
  → manage_material(save)
```

`manage_material` remains the single PBR mutation boundary. `list_materials` is the compact overview; `get_material_info` is the one-PBR-set diagnostic read.

## PBR sources

A PBR Texture Set has three semantic source groups.

### Color

Use exactly one of:

- a color texture; or
- uniform RGBA.

Do not create a second base-color atlas merely because the model has several visual material families. Normal entity production remains one production base-color atlas.

### Depth

Use at most one:

- normal texture; or
- height texture.

`normal XOR height` is a hard PBR invariant. A normal texture represents surface directions in RGB. A height texture is scalar/grayscale displacement evidence. Do not place a grayscale height map into the normal channel or use normal and height simultaneously.

### Surface response

MER is RGB:

- **R** = Metalness
- **G** = Emissive
- **B** = Roughness

A MER texture with `subsurface_value=0` exports as normal MER behavior.

**MER texture + subsurface_value>0** selects the Bedrock MERS texture-set form. The texture still uses Blockbench's `mer` channel, but alpha is now semantically meaningful:

- **R** = Metalness
- **G** = Emissive
- **B** = Roughness
- **A** = Subsurface

Do not invent a separate Blockbench MERS texture channel while the native API represents it as MER plus subsurface configuration.

Uniform MER/MERS is also valid when no MER texture is required.

## `authoring_status`

PBR reads and mutation receipts expose one compact `authoring_status` with:

```text
domain = pbr_texture_set
```

It separates:

- `sources.color` — texture / uniform / unresolved;
- `sources.depth` — normal texture / height texture / none;
- `sources.surface` — MER texture / MERS texture / uniform / default;
- `readiness.preview` — whether PBR channel semantics are internally coherent;
- `readiness.save` — whether a native texture-set save target exists and whether it is already saved;
- `next_actions` — only the remaining PBR steps.

A valid preview does not imply a writable export path. Native Blockbench derives the `.texture_set.json` save location from the PBR color texture path. Therefore `save.path_ready=false` is not a PBR-quality failure; it means the native save target has not been established yet.

## PBR content diagnostics

Technical membership alone is insufficient. Active PBR maps receive bounded semantic diagnostics:

- normal-map RGB sanity;
- height-map grayscale sanity;
- MER/MERS channel interpretation;
- MERS metalness/subsurface overlap review.

These diagnostics are not artistic scores. They must not reject valid stylized maps merely because the distribution is unusual.

### Normal

A flat tangent-space normal is approximately `(128,128,255)`. Normal maps should generally behave as encoded vectors rather than grayscale photographs. A mostly grayscale normal map is therefore a strong channel-mismatch candidate.

### Height

Height maps represent scalar height and should be grayscale. Meaningful RGB channel divergence is a review signal.

### MER / MERS

Partial metalness is allowed and advisory. Emissive coverage and roughness distribution are descriptive evidence. For MERS, significant simultaneous metalness and subsurface at the same pixels is a review candidate because these behaviors normally represent different surface classes.

## Render-profile boundary

PBR emissive data and Minecraft entity emissive render materials are separate concepts.

```text
MER green channel / MERS
≠
entity_emissive / entity_emissive_alpha
```

Do not select a `render_profile` merely because MER contains emissive values, and do not create MER just because the entity uses an emissive render material. Both may coexist when the target pipeline explicitly requires both.

## Seam continuity

Texture completion is not proven by per-face coverage alone. `list_textures.seam_continuity` samples a small bounded set of physical cube edges and ranks high-contrast or alpha-discontinuous seams.

Seam evidence is advisory:

- never auto-fix a seam;
- never convert seam contrast alone into visual FAIL;
- intentional face lighting, panel boundaries, trim, or render-profile boundaries may legitimately differ;
- inspect only ranked candidates against approved reference and current mapped model views.

The diagnostic uses edge samples only; it must not add another full-atlas scan.

## Reference identity

`get_texture.color_profile` supports palette/value reasoning but is evidence rather than a similarity score. Preserve identity colors and accents visible in the approved reference. Do not enforce arbitrary color counts or automatic similarity percentages.

## Validation order

```text
PBR channel membership
  → production atlas alignment
  → PBR content sanity
  → seam/coverage advisories
  → PBR preview
  → mapped model-view verification
  → save
```

Technical `ready` never means visually approved.

## Efficiency contract

- no new MCP tool is required for these diagnostics;
- no new runtime dependency is required;
- seam scanning is bounded edge sampling;
- PBR-content scanning runs only for active PBR support textures and uses a bounded sample budget;
- PBR status is metadata-only;
- normal non-PBR texturing pays no PBR content-analysis cost beyond discovering that no active PBR maps exist.
