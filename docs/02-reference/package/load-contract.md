# LazyDesigner Reference Package Load Contract

Updated: 2026-09-18

This document owns how Astra/Codex consumes a ChatGPT-generated LazyDesigner reference package. It does not define Geometry, Texture, Animation, Particle authoring, image-generation, or Runtime implementation semantics.

## Objective

Keep package consumption deterministic and small:

```text
REFERENCE.json
→ identify asset kind / task / readiness
→ load only the active stage or referenced resource needed next
→ load current downstream authoring state
→ work
```

Do not read every Markdown file, image, particle JSON, or texture by default.

## Entry Point

`REFERENCE.json` is always the LazyDesigner downstream package entry point.

Model package example:

```text
asset_reference/
├── REFERENCE.json
├── GEOMETRY.md
├── TEXTURE.md      ← optional
├── ANIMATION.md    ← optional
└── images/
```

Particle package example:

```text
asset_reference/
├── REFERENCE.json
├── particles/
│   └── <name>.particle.json
└── textures/
    └── particle/
        └── <name>.png
```

`PARTICLE_HANDOFF.json` or another parallel manifest is not used.

## Asset Kind Dispatch

Read `REFERENCE.json.asset` first.

```text
recognized model profile + no asset.kind
→ MODEL for backward compatibility

asset.kind = MODEL
→ model/stage workflow

asset.kind = PARTICLE
→ particle/resource handoff workflow
```

A Particle package does not need a fake modelling profile.

## Authority Order

```text
explicit current user requirement
→ approved visual/resource reference
→ confirmed scale/resource requirement
→ REFERENCE.json structured facts
→ active stage/resource file
→ downstream interpretation
```

A lower authority never silently overrides a higher authority. Block only the dependent decision when a material conflict exists.

## Model Stage Load Order

### Geometry

```text
1. REFERENCE.json
2. GEOMETRY.md when present
3. Geometry image IDs referenced by GEOMETRY.md
   OR images.used_by includes GEOMETRY when GEOMETRY.md is absent
4. current asset Geometry state when continuing/correcting
5. LazyDesigner Modelling Skill + exactly one selected profile when useful
```

### Texture

```text
1. REFERENCE.json
2. TEXTURE.md when present
3. Texture image IDs referenced by TEXTURE.md
   OR images.used_by includes TEXTURE when TEXTURE.md is absent
4. current approved Geometry/UV state
5. LazyDesigner Texturing Skill
```

### Animation

```text
1. REFERENCE.json
2. ANIMATION.md when present
3. Animation image IDs referenced by ANIMATION.md
   OR images.used_by includes ANIMATION when ANIMATION.md is absent
4. current approved rig/hierarchy/pivot state
5. LazyDesigner Animation Skill
```

Do not reload unrelated stage prose.

For model authoring, state/presentation variants and moving attachment relationships stay inside the active stage document plus current authored state. Do not add Control packet fields for them. A moving Locator is resolved as Locator → parent Group/Bone → animation ownership, not as a direct Locator keyframe target.

## Particle Load Order

For `asset.kind=PARTICLE`, use the specialization in `particle-handoff.md`.

```text
1. REFERENCE.json
2. read particle block only
3. inspect referenced particle JSON only when needed for the next decision
4. inspect referenced PNG only when needed for visual/texture work
5. inspect current Blockbench/MCP runtime state before destructive integration
6. route the smallest unresolved dependency
```

Decision routing:

```text
texture_state = MISSING
→ existing Texturing pipeline

particle asset needs create/patch/preview
→ inspect_particle / manage_particle

recommended_locator supplied
→ verify locator exists; create/fix through manage_locator only if needed

recommended_animation / trigger supplied
→ verify target animation; bind through manage_animation_effects

controller state binding required
→ manage_animation_controller
```

`recommended_locator`, `recommended_animation`, trigger time, and review state are handoff intent, not proof of live runtime existence or approval.

Do not load modelling profile context for a particle-only package.

## Optional Stage / Resource Rule

A stage Markdown file may be absent when it would not materially improve correctness. A Particle handoff may contain no stage Markdown at all when `REFERENCE.json` plus actual Bedrock resources are sufficient.

Missing optional Markdown is not an error.

A missing resource that `REFERENCE.json` marks `READY` is a package-consistency error; do not silently substitute another file.

## Image Loading Rule

Never scan `images/` blindly.

Preferred model image resolution:

```text
stage Markdown image IDs
→ if stage Markdown absent, REFERENCE.json images.used_by
→ additional image only for a specific unresolved decision
```

Particle textures/resources are loaded by explicit path from the particle block, not by browsing every image/resource.

## Scale / Resource Loading Rule

Model scale comes from `REFERENCE.json.requirements`:

```text
dimensions_blocks
player_relative_scale
```

Particle resource identity comes from the particle block:

```text
identifier
particle_json
texture_reference
texture_png
texture_state
```

Do not infer either from filenames when structured authority already exists.

## Cross-Stage / Cross-System Leakage Rule

```text
GEOMETRY.md
→ form / proportion / topology / representation / rig-readiness

TEXTURE.md
→ materials / colors / markings / surface / alpha / emissive / PBR

ANIMATION.md
→ participants / motion / poses / timing / contact / deformation

particle block
→ resource identity/path + downstream integration recommendation only
```

Do not copy MCP schemas, Particle JSON contents, or Texturing instructions into `REFERENCE.json`.

## Unknown / Blocker Rule

`REFERENCE.json` owns the canonical unknown inventory.

```text
Texture-only unknown
→ does not block Geometry

rig blocker
→ may block Animation while Texture remains READY

missing custom particle PNG
→ blocks particle texture dependency only
→ does not invent a second Particle authoring system
```

Do not promote a non-blocking unknown simply because another file mentions it.

## Correction / Delta Load

For bounded corrections:

```text
REFERENCE.json
→ identify changed fact + affected stage/resource
→ load affected stage/resource only
→ load current affected runtime state
→ preserve unaffected accepted context
```

Do not reread the entire package unless the change invalidates whole-asset identity, scale/resource identity, or multiple authorities.

## Package Consistency Gate

Before handoff, ChatGPT verifies:

```text
all listed documents/images/resources exist
images.used_by uses valid stages
stage files agree with REFERENCE.json
particle identifier/path/texture metadata agree when asset.kind=PARTICLE
custom particle texture reference matches the packaged PNG path
no stage/resource metadata introduces unsupported facts
numeric/player-relative scale do not conflict for models
readiness matches blockers/resource state
omitted optional files are not referenced
```

A failing package is not ready for Codex.

## Minimal Consumption Principle

```text
ORIENT ONCE
→ LOAD ONLY THE NEXT AUTHORITY NEEDED
→ INSPECT CURRENT RUNTIME STATE
→ WORK
```

Not:

```text
READ EVERYTHING
→ REINTERPRET EVERYTHING
→ WORK
```

The goal is minimum sufficient context, not minimum context at the expense of fidelity.

## Completion

This contract is satisfied when Astra/Codex can determine:

```text
what kind of asset/reference was handed off
where to start
which model stage or Particle resource matters next
what can be ignored
what is recommendation versus runtime proof
how corrections remain bounded
```

without using the original ChatGPT transcript.
