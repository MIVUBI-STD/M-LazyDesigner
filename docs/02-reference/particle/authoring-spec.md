# Particle Authoring Specification

Use this contract to normalize a particle request before authoring. Ask only for missing facts that materially change the result.

## 1. Intent extraction

Resolve from the user's prompt/reference when present:

```text
effect / phenomenon
primary visual role
target runtime: Bedrock, Snowstorm preview, or both
approximate scale / viewing distance when material
duration or loop behavior when material
main motion direction / travel goal
environment or existing geometry when relevant
visual style / texture direction
```

Optional constraints:

```text
explicit motion envelope
spawn region
keep-out region
particle-count budget
atlas/grid requirements
reference images or approved prior assets
entity/locator attachment
```

## 2. Requirement classification

```text
BLOCKING
→ cannot author the requested semantic result responsibly without it

USEFUL
→ improves quality but can use a reversible provisional choice

OPTIONAL
→ does not need resolution before first authoring pass
```

Ask only BLOCKING questions before authoring. Do not turn a short request into a questionnaire.

For USEFUL/OPTIONAL unknowns, choose a conservative reversible authoring default when possible, but classify it internally as `PROVISIONAL`; never present it as a user requirement or measured runtime truth.

## 3. Execution class

Classify the request once before loading deep knowledge:

```text
DIRECT
→ one dominant physics/render role
→ usually one emitter/effect
→ examples: blue flame, ambient dust, sparks, simple smoke

COMPOSED
→ multiple materially different visual/physics roles
→ examples: impact flash + debris + dust; eruption core + bombs + plume

REACTIVE
→ behavior depends on collision, events, entity state, locators, child effects, or external Molang context

AUDIT / REVISION
→ existing JSON/package is the source of truth; change only the causal layer
```

Do not promote a DIRECT request into COMPOSED merely to make the structure look sophisticated.

## 4. Physical pattern selection

After execution-class selection, choose the smallest physical starting pattern from `patterns.md` before deep technical reading.

Pattern selection answers:

```text
what moves?
where does it spawn?
what is the dominant force/motion?
how does it age/fade?
what secondary role is actually necessary?
```

Examples:

```text
blue flame
→ Flame

sparks
→ Sparks

smoke plume
→ Rising smoke/plume

ambient dust
→ Ambient dust

rain
→ Rain

magic aura
→ Magic aura/energy field

impact
→ Impact burst

explosion
→ composed candidate roles, but include only required layers
```

Keywords are routing hints, not rigid templates. Explicit user motion/style requirements override keyword mapping.

If one pattern explains the effect, keep the request DIRECT. Combine patterns only when physics, timing, spawn region, render/material role, texture class, or event/attachment ownership materially differs.

## 5. Complexity tier

Choose the smallest implementation tier that satisfies the effect:

```text
TIER 0 — constants only
TIER 1 — simple particle-age/random Molang
TIER 2 — curves, richer formulas, atlas/flipbook, or multiple layers
TIER 3 — events, collision chains, entity context, advanced attachment or nested effects
```

Start at the lowest viable tier. Escalate only when a required behavior cannot be represented cleanly at the current tier.

## 6. Output identity

Resolve output identity once before files are authored:

```text
namespace
package_slug
effect_slug
root_identifier
child role slugs, if any
texture basename or shared texture mapping
standalone Resource Pack vs downstream handoff
```

Default naming rule:

```text
lowercase snake_case
semantic role names
no revision suffixes
```

Example:

```text
namespace       = mivubi
package_slug    = blue_flame
effect_slug     = blue_flame
root_identifier = mivubi:blue_flame
particle_file   = particles/blue_flame.particle.json
texture_file    = textures/particle/blue_flame.png
texture_ref     = textures/particle/blue_flame
```

Do not independently invent names later during packaging. The resolved output identity is the single naming source for JSON, texture paths, README, and optional `REFERENCE.json`.

If the user/project already provides a namespace or naming convention, preserve it. Otherwise use the established workspace convention when known; if none exists, choose a conservative provisional namespace rather than implying it is authoritative.

## 7. Internal execution packet

Before authoring, reduce the request to a compact packet:

```text
intent
execution_class
pattern_family / composed_patterns
complexity_tier
target
layers
physics_role_per_layer
spawn_owner
motion_model
render/material role
texture_strategy
Molang role: none / identity / progression / external-reactive
Snowstorm-specific requirements
QA gates required
provisional assumptions
output_identity
final delivery shape
```

This packet is internal control state, not a new persisted system.

## 8. Decomposition rule

Split layers only when they materially differ in one or more of:

```text
physics
spawn region
timing
render/material behavior
texture class
attachment/event ownership
```

Good:

```text
volcano → ballistic debris + rising plume
impact  → flash + debris + dust when all three are visually required
```

Bad:

```text
simple flame → several emitters with identical motion/render roles
```

Use `patterns.md` to decide the initial physical decomposition, then adapt rather than copy it literally.

Child effect names should describe those physical roles, e.g. `_debris`, `_plume`, `_flash`, rather than revision history.

## 9. Texture decision

Choose texture work only to the level required:

```text
existing suitable texture
→ reuse/validate

simple static sprite
→ one RGBA texture

multiple stable visual classes
→ atlas only when simpler than separate effects/textures

animated visual frames
→ flipbook
```

Do not create an atlas, flipbook, or generated texture pipeline by default.

Do not duplicate the same PNG solely to mirror child particle filenames; intentional shared texture references are valid when clear.

## 10. Appearance and temporal ownership

Resolve billboard orientation and texture-time ownership before adding formulas:

```text
camera-facing soft sprite
→ lookat/rotate billboard family

velocity/direction-readable sprite
→ direction-aligned billboard family

static visual
→ fixed UV region

frame animation
→ flipbook

physical travel
→ motion component, not flipbook
```

Choose `facing_camera_mode` from the visual role. Do not use a direction-aligned billboard merely because the particle moves, and do not force a camera-facing mode when the sprite must communicate travel heading.

For flipbooks, explicitly decide:

```text
base_UV
size_UV
step_UV
max_frame
timing owner: frames_per_second | stretch_to_lifetime
loop intent
```

`stretch_to_lifetime` makes particle lifetime the playback-duration owner. Otherwise `frames_per_second` owns nominal frame timing. Do not author both as competing timing intentions.

Emitter activation remains emitter-owned. `activation_expression` controls whether emission is active and `expiration_expression` can terminate the emitter; neither should be used as a substitute for per-particle lifetime progression.

## 11. Molang decision

Use Molang only when a constant cannot express the intended behavior cleanly.

```text
constant property
→ constant

stable per-particle variation
→ particle_random_N

lifetime progression
→ particle_age / particle_lifetime, simple formula, easing, or curve

emitter phase
→ emitter-owned state

external/entity reactivity
→ query/context only when the actual host provides it
```

Do not add formulas merely because Molang is available.

## 12. Snowstorm compatibility baseline

When Snowstorm/Wintersky preview is a target and authored launch magnitude matters, prefer:

```text
emitter shape direction = launch vector
minecraft:particle_initial_speed = scalar speed
```

This is Snowstorm-targeted compatibility guidance, not a generic Bedrock prohibition on vector initial-speed forms.

## 13. Authority order

```text
explicit current user requirement
→ visible reference evidence
→ approved prior particle decision
→ target-version official Bedrock semantics
→ documented Snowstorm/Wintersky behavior when editor-specific
→ canonical physical pattern reasoning
→ conservative reversible authoring choice
→ unresolved remains UNKNOWN
```

Never invent hidden geometry, exact performance, runtime behavior, or user constraints. Reversible visual defaults are acceptable only when recorded as provisional and when asking would not materially improve the first pass.
