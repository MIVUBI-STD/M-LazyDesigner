# LazyDesigner Reference Package Schema

Updated: 2026-09-18

This document owns the canonical base structure of `REFERENCE.json`, the machine-readable index handed from ChatGPT Reference Preparation to Codex.

It does not own visual-sheet design, authoring procedure, Runtime implementation semantics, or full Particle resource content.

Specializations:

```text
MODEL stage documents → geometry.md / texture.md / animation.md
PARTICLE handoff       → particle-handoff.md
```

## Objective

`REFERENCE.json` answers only:

```text
what kind of asset/reference is being handed off
what stable requirements are confirmed
what scale/resource authority exists
what visual/resource authority exists
what documents/resources exist
what decision-critical relationships are known
what remains unknown/blocking
which downstream decisions are ready
```

It is an index and structured fact contract, not a modelling blueprint or a copy of authored resource files.

## Authority Order

```text
1. explicit current user requirement
2. approved visual/resource reference
3. confirmed numeric / player-relative / resource-path requirement
4. REFERENCE.json structured facts
5. active stage/resource projection
6. downstream interpretation
```

Material conflicts between stronger authorities must remain explicit and block only dependent decisions.

## Schema Identity

```text
file:   REFERENCE.json
schema: lazydesigner-reference-v1
```

The v1 schema supports both model-oriented and Particle-oriented handoffs through `asset.kind` while keeping backward compatibility with older model packages that omit it.

## Canonical Shape

```json
{
  "schema": "lazydesigner-reference-v1",
  "asset": {},
  "requirements": {},
  "approval": {},
  "documents": {},
  "images": [],
  "parts": [],
  "articulation": [],
  "materials": [],
  "animation_guidance": [],
  "particle": {},
  "constraints": [],
  "unknowns": {},
  "readiness": {}
}
```

Omit empty optional arrays/objects when they add no downstream value.

## `asset` — required

Model example:

```json
{
  "name": "farmer_npc",
  "kind": "MODEL",
  "profile": "HUMANOID",
  "task": "NEW_ASSET",
  "intent": "Farmer NPC harvesting cinnamon"
}
```

Particle example:

```json
{
  "name": "dust_hit",
  "kind": "PARTICLE",
  "task": "NEW_ASSET",
  "intent": "Short dust burst when a hoe contacts the ground"
}
```

Required fields for every package:

```text
name
task
intent
```

`kind`:

```text
MODEL | PARTICLE
```

Backward compatibility:

```text
recognized MODEL profile + asset.kind omitted
→ downstream Control may treat the package as MODEL
```

New packages should write `kind` explicitly.

### MODEL profile

`profile` is required only when `kind=MODEL`:

```text
PROP_FURNITURE | VEHICLE | HUMANOID | CREATURE | MECHANICAL | PLANT_FOLIAGE | GENERIC
```

Do not use `GENERIC` as a placeholder for Particle.

### Task

```text
NEW_ASSET | CONTINUE_ASSET | CORRECTION
```

`intent` is one short normalized statement of the approved current goal. Never store conversation history or a generation prompt here.

## `requirements` — required for MODEL, optional/minimal for PARTICLE

MODEL recommended shape:

```json
{
  "dimensions_blocks": {
    "width": null,
    "height": null,
    "length": null
  },
  "player_relative_scale": "PLAYER_HEIGHT",
  "animation_required": true
}
```

Rules:
- `null` means unknown;
- never infer block values from image pixels;
- explicit user dimensions remain authoritative unless changed by the user;
- do not invent per-part dimensions;
- `animation_required` is boolean only when confirmed.

`player_relative_scale` may use:

```text
HANDHELD
WEARABLE
BELOW_KNEE
KNEE_HEIGHT
WAIST_HEIGHT
CHEST_HEIGHT
PLAYER_HEIGHT
ABOVE_PLAYER_HEIGHT
RIDEABLE_1P
RIDEABLE_2P
STALL_SCALE
ROOM_SCALE
CUSTOM
```

For Particle-only packages, `requirements` may contain only facts that materially constrain downstream integration, such as `animation_required` when confirmed. Do not invent model dimensions for Particle.

## `approval` — required for generated packages when approval state matters

```json
{
  "brief": "APPROVED",
  "visual_authority": "APPROVED",
  "package_generation": "APPROVED"
}
```

Allowed values:

```text
APPROVED | NOT_REQUIRED | PENDING
```

Never infer approval from silence. Particle resource review may additionally use `particle.review_state`; that state does not claim live Blockbench/Minecraft approval.

## `documents` — optional

List only files that actually exist:

```json
{
  "geometry": "GEOMETRY.md",
  "texture": "TEXTURE.md",
  "animation": "ANIMATION.md"
}
```

MODEL packages may use these stage projections. Particle packages normally do not need them when actual `.particle.json`/`.png` resources plus the `particle` block are sufficient.

## `images` — required only when visual evidence is packaged

```json
{
  "id": "IMG_GEO_01",
  "file": "images/01-main-reference.png",
  "role": "PRIMARY_GEOMETRY",
  "used_by": ["GEOMETRY"],
  "status": "APPROVED"
}
```

Recommended fields:

```text
id
file
role
used_by
status
```

`role` examples:

```text
CONCEPT
PRIMARY_GEOMETRY
STRUCTURAL_DETAIL
MATERIAL_TEXTURE
RIG_DEFORMATION
POSE_ACTION
EXPRESSION_FACE
ANIMATION_KEYFRAME
SOURCE_REFERENCE
```

`used_by`:

```text
GEOMETRY | TEXTURE | ANIMATION
```

Particle resource PNGs should normally be referenced through `particle.texture_png`, not duplicated as generic image entries unless they also serve as review/reference evidence.

## MODEL semantic sections

The following sections are MODEL-oriented and optional:

```text
parts
articulation
materials
animation_guidance
```

Use only decision-critical supported facts. Do not include Cube inventories, final pivot coordinates, hidden anatomy guesses, pixel-paint instructions, or frame-by-frame implementation unless explicitly required.

State/presentation variants do **not** require a new top-level schema field. Represent only supported facts through existing `parts`, `articulation`, `constraints`, and the relevant stage document; local variants should identify only the changed semantic branch. Likewise, a moving Locator is represented by its attachment/parent relationship and downstream stage guidance, not by a direct Locator-animation schema.

### `parts`

Example:

```json
{
  "id": "right_hand",
  "role": "GEOMETRY",
  "parent": "right_lower_arm",
  "symmetry": "PAIRED",
  "motion": "ARTICULATED",
  "evidence": "SUPPORTED"
}
```

Vocabulary:

```text
role:     GEOMETRY | TEXTURE | ANIMATION_ONLY | EFFECT | OMIT | UNRESOLVED
symmetry: NONE | MIRRORED | PAIRED | REPEATED | ASYMMETRIC | UNKNOWN
motion:   STATIC | RIGID | ARTICULATED | FLEXIBLE | UNKNOWN
evidence: SUPPORTED | PROVISIONAL | CONFLICTING | UNAVAILABLE
```

### `articulation`

Use only when Geometry/Animation decisions depend on a joint/relationship. Record motion intent, pivot region, overlap/clearance constraints and risk; never invent final pivot coordinates.

### `materials`

Use only supported material facts such as base color, surface character, emissive/PBR relevance and affected semantic parts.

### `animation_guidance`

Example:

```json
{
  "name": "harvest_cinnamon",
  "type": "ONE_SHOT",
  "purpose": "harvest cinnamon with the held tool",
  "participants": ["torso", "right_upper_arm", "right_lower_arm", "tool"],
  "key_poses": ["ready", "anticipation", "contact", "follow_through", "recovery"],
  "contact_events": ["tool_to_target"]
}
```

This is guidance, not final implementation timing unless explicitly confirmed.

## `particle` — optional; used when `asset.kind=PARTICLE`

Canonical detailed owner: `particle-handoff.md`.

Compact shape:

```json
{
  "identifier": "mivubi:dust_hit",
  "particle_json": "particles/dust_hit.particle.json",
  "texture_reference": "textures/particle/dust_hit",
  "texture_png": "textures/particle/dust_hit.png",
  "texture_state": "READY",
  "recommended_locator": "hoe_tip",
  "recommended_animation": "harvest_cinnamon",
  "trigger": {
    "intent": "tool contact with ground",
    "time_seconds": 0.42
  },
  "bind_to_actor": true,
  "review_state": "APPROVED"
}
```

Rules:
- resource paths are package-relative, never user-machine absolute paths;
- `texture_reference` omits `.png`;
- custom generated textures use `textures/particle/<name>` + `textures/particle/<name>.png`;
- `recommended_locator`, `recommended_animation`, and trigger fields are integration recommendations, not proof of live runtime existence;
- `review_state` is reference-review authority only;
- do not embed Particle JSON or PNG bytes inside `REFERENCE.json`.

`texture_state`:

```text
READY | MISSING | NOT_REQUIRED
```

`review_state`:

```text
APPROVED | NEEDS_REVIEW | SOURCE_ONLY
```

## `constraints` — optional

Short list of stable correctness constraints that do not fit more cleanly elsewhere.

Examples:

```text
supplied tool replaces a generic pickaxe
preserve backpack silhouette
do not expose large hip/knee gaps during intended motion
particle must attach at tool-contact locator, not entity origin
```

Do not store generic tutorial advice or repeat whole stage/resource sections.

## `unknowns` — required

```json
{
  "blocking": [],
  "non_blocking": ["exact underside color of basket"]
}
```

`blocking` means the missing/conflicting fact can materially change the next required decision.

For Particle, examples include:

```text
missing custom PNG required by the authored particle
unknown target locator when attachment position materially matters
unresolved visual review that changes particle behavior/appearance
```

Do not guess unknowns away to make the package appear complete.

## `readiness` — required

```json
{
  "overall": "READY",
  "geometry": "READY",
  "texture": "READY",
  "animation": "READY"
}
```

Allowed values:

```text
READY | NOT_REQUIRED | NEEDS_REVIEW | BLOCKED
```

MODEL rules:
- readiness is stage-specific;
- a relevant blocking unknown makes that stage `BLOCKED`;
- missing Texture detail does not block Geometry unless it changes Geometry;
- static assets use `animation: NOT_REQUIRED`.

PARTICLE rules:
- `geometry` is normally `NOT_REQUIRED` unless the downstream task explicitly requires Locator/geometry correction;
- `texture` reflects whether required custom bitmap/reference work is ready;
- `animation` reflects whether integration intent is sufficiently specified, not whether the runtime animation already exists;
- `overall` must agree with blocking unknowns and resource readiness.

## Compact MODEL Example

```json
{
  "schema": "lazydesigner-reference-v1",
  "asset": {
    "name": "farmer_npc",
    "kind": "MODEL",
    "profile": "HUMANOID",
    "task": "NEW_ASSET",
    "intent": "Farmer NPC harvesting cinnamon"
  },
  "requirements": {
    "player_relative_scale": "PLAYER_HEIGHT",
    "animation_required": true
  },
  "approval": {
    "brief": "APPROVED",
    "visual_authority": "APPROVED",
    "package_generation": "APPROVED"
  },
  "documents": {
    "geometry": "GEOMETRY.md",
    "animation": "ANIMATION.md"
  },
  "unknowns": {
    "blocking": [],
    "non_blocking": []
  },
  "readiness": {
    "overall": "READY",
    "geometry": "READY",
    "texture": "READY",
    "animation": "READY"
  }
}
```

## Compact PARTICLE Example

```json
{
  "schema": "lazydesigner-reference-v1",
  "asset": {
    "name": "dust_hit",
    "kind": "PARTICLE",
    "task": "NEW_ASSET",
    "intent": "Short dust burst when a hoe contacts the ground"
  },
  "requirements": {
    "animation_required": true
  },
  "particle": {
    "identifier": "mivubi:dust_hit",
    "particle_json": "particles/dust_hit.particle.json",
    "texture_reference": "textures/particle/dust_hit",
    "texture_png": "textures/particle/dust_hit.png",
    "texture_state": "READY",
    "recommended_locator": "hoe_tip",
    "recommended_animation": "harvest_cinnamon",
    "trigger": {
      "intent": "tool contact with ground",
      "time_seconds": 0.42
    },
    "bind_to_actor": true,
    "review_state": "APPROVED"
  },
  "unknowns": {
    "blocking": [],
    "non_blocking": []
  },
  "readiness": {
    "overall": "READY",
    "geometry": "NOT_REQUIRED",
    "texture": "READY",
    "animation": "READY"
  }
}
```

## Package Economy

Never include:

```text
conversation transcript
compiled-prompt history
full Skills
Tool schemas
Cube-by-Cube plans
exact implementation coordinates
generic tutorials
repeated prose already owned by stage/resource files
embedded Particle JSON/PNG copies
parallel Particle handoff manifests
```

## Correction Rule

A bounded user correction updates only affected facts, resource/image references, readiness, and stage/resource files.

Preserve unaffected accepted authority.

## Completion

`REFERENCE.json` is ready when:

```text
asset kind is unambiguous
blocking requirements for the intended next decision are resolved
required approvals/review states are explicit where needed
MODEL scale facts do not materially conflict
PARTICLE identifier/resource paths agree with packaged files
all listed documents/images/resources exist
unknowns remain explicit
no field contains unsupported invented facts
readiness is accurate
package is understandable without the original ChatGPT transcript
```
