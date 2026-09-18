# LazyDesigner Particle Reference Handoff

Updated: 2026-09-11

This document owns the **Particle specialization of the canonical `REFERENCE.json` handoff** between ChatGPT Reference Preparation and Codex / LazyDesigner MCP.

It does not create a second package format, MCP tool family, or Particle authoring phase.

## Boundary

```text
ChatGPT Particle Reference Authoring
→ prepares Bedrock particle JSON + texture/package + review metadata
→ writes one canonical REFERENCE.json entry point when downstream handoff is requested
→ Codex / Control consumes only the minimum structured metadata needed
→ LazyDesigner MCP implements/integrates through existing Particle, Texturing and Animation capabilities
```

Standalone user delivery may still be an ordinary Bedrock Resource Pack without MCP involvement. `REFERENCE.json` is required only when the package is intended for LazyDesigner downstream handoff.

## Asset Identity

Particle packages use:

```json
{
  "asset": {
    "name": "dust_hit",
    "kind": "PARTICLE",
    "task": "NEW_ASSET",
    "intent": "Short dust burst when a hoe contacts the ground"
  }
}
```

`profile` is not required for `kind=PARTICLE`. Do not invent `GENERIC` or a fake modelling profile merely to satisfy a model-oriented field.

Existing model packages may omit `asset.kind`; Control treats a recognized modelling `profile` as `MODEL` for backward compatibility.

## Canonical Particle Block

When `asset.kind=PARTICLE`, use one optional top-level `particle` object:

```json
{
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
  }
}
```

All fields are optional unless needed by the downstream task. Omit unknown/non-applicable values rather than filling placeholders.

### Field semantics

```text
identifier            Bedrock particle identifier used by manage_particle / binding
particle_json          package-relative .particle.json path
texture_reference      Bedrock texture reference without .png
texture_png            package-relative PNG path
texture_state          READY | MISSING | NOT_REQUIRED
recommended_locator    preferred existing/new locator name; recommendation, not proof it exists
recommended_animation  preferred animation target; recommendation, not proof it exists
trigger.intent         semantic trigger description when exact time is not authoritative
trigger.time_seconds   explicit recommended time only when known/supported
bind_to_actor          intended particle effect binding flag when known
review_state           APPROVED | NEEDS_REVIEW | SOURCE_ONLY
```

## Path Contract

Custom particle texture paths follow the same canonical Resource Pack layout used by LazyDesigner:

```text
particles/<name>.particle.json
textures/particle/<name>.png
```

and:

```text
texture_reference = textures/particle/<name>
texture_png       = textures/particle/<name>.png
```

Do not hand off versioned scratch names or absolute local machine paths inside `REFERENCE.json`.

## Readiness Mapping

Particle-only packages normally use:

```json
{
  "readiness": {
    "overall": "READY",
    "geometry": "NOT_REQUIRED",
    "texture": "READY",
    "animation": "READY"
  }
}
```

Interpretation:

```text
texture READY
→ required custom bitmap already exists/reviewed, or texture is NOT_REQUIRED/vanilla as described

animation READY
→ particle metadata is sufficient for downstream binding decisions
→ does not claim the recommended locator/animation already exists in Blockbench
```

If a custom bitmap is missing:

```text
texture_state = MISSING
readiness.texture = BLOCKED or NEEDS_REVIEW as appropriate
```

LazyDesigner then routes the dependency through the existing Texturing pipeline; Particle tooling must not create a second texture-authoring system.

## Consumption Contract

For `asset.kind=PARTICLE`, downstream consumption is:

```text
REFERENCE.json
→ read particle block
→ inspect only referenced particle JSON/PNG when needed
→ if texture_state=MISSING: Texturing dependency first
→ inspect/create required Locator through existing Geometry/Locator capability only when needed
→ manage_particle
→ manage_animation_effects for effect/time/locator binding
→ existing controller capability only when controller state binding is required
```

Do not load modelling profile prose for a particle-only package.

## Authority Rule

The fields carry **handoff intent**, not runtime truth.

Examples:

```text
recommended_locator = hoe_tip
≠ locator existence proven

recommended_animation = harvest_cinnamon
≠ animation existence proven

review_state = APPROVED
= ChatGPT/user reference approval state only
≠ Blockbench/Minecraft runtime approval
```

Codex/MCP must inspect current runtime state before destructive integration.

## No Duplicate Systems

Do not create:

```text
PARTICLE profile in modelling
PARTICLE authoring phase
PARTICLE_HANDOFF.json
create_particle_texture
save_particle_texture
particle-specific locator tool
particle-specific animation-binding tool
```

Use the existing owners:

```text
Particle asset        → inspect_particle / manage_particle
Texture bitmap        → existing Texturing pipeline
Locator                → manage_locator
Animation effect       → manage_animation_effects
Controller integration → manage_animation_controller
```

## Package Example

```text
asset_reference/
├── REFERENCE.json
├── particles/
│   └── dust_hit.particle.json
└── textures/
    └── particle/
        └── dust_hit.png
```

No stage Markdown is required when `REFERENCE.json` plus the actual particle resources already provide sufficient downstream authority.

## Completion

The handoff is ready when:

```text
asset.kind is PARTICLE
particle identifier/path references agree with packaged resources
custom texture reference/path agree when present
texture_state reflects reality at handoff time
blocking unknowns remain explicit
recommended binding metadata is clearly recommendation-level authority
readiness does not claim runtime existence/approval
package is understandable without the original ChatGPT transcript
```
