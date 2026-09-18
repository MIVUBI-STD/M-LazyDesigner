# LazyDesigner Control Context Projection

Updated: 2026-09-12

This document defines the canonical stage-specific context contract projected by LazyDesigner Control to Codex for asset authoring.

Control owns **selection and transport**. Skills consume the projection. Reference Preparation owns source reference facts. Workspace/Runtime own current authored state. No stage Skill should rebuild this contract independently.

Overall REQUIRED / CONDITIONAL / EXCLUDED loading policy is owned by:

```text
docs/04-system/ai-context-loading.md
```

## Objective

Project the **minimum sufficient current decision context** without turning Control into a second Reference Package, workflow engine, or persistent asset database.

```text
REFERENCE PACKAGE / approved reference artifact
+ WORKSPACE / RUNTIME STATE
+ USER DELTA
+ READINESS / FRESHNESS
        ↓
      CONTROL
        ↓
GEOMETRY_CONTEXT | TEXTURE_CONTEXT | ANIMATION_CONTEXT
```

## Packet Layering

Control separates compact summaries from one active-stage projection:

```text
workspace
→ availability / fingerprint / asset / unavailable reason

reference
→ availability / fingerprint / asset / selected profile / unavailable reason

stage_context
→ one self-contained decision envelope for the active semantic owner
```

Do not repeat complete Workspace state, full Reference readiness, document prose, image metadata, Skill text, Tool schemas, per-Cube plans, per-pixel plans, or per-keyframe plans in the packet.

## Stage Context: Source-Owned Shape

The Runtime implementation in `mcp/gateway/control/contextProjection.ts` owns the concrete packet shape. The canonical envelope is intentionally compact:

```text
context_type
context_hash
original_user_intent
current_user_delta
selected_profile
reference_package_id_or_hash
workspace_revision_or_hash
stage_readiness
blocking_unknowns
non_blocking_unknowns_relevant_to_stage
requirements
reference_document
reference_image_ids
workspace.asset
workspace.current_stage
workspace.gates
workspace.next_step
```

This is deliberate. `stage_context` does **not** duplicate the complete semantic contents of the referenced Geometry/Texture/Animation document.

## Where Domain Detail Lives

Decision detail is resolved only when it is material:

```text
reference_document + relevant image IDs
→ approved stage evidence / semantic relationships

workspace / Runtime state
→ current authored identities and live state

active specialist
→ domain execution reasoning

selected Geometry profile
→ reusable asset-class modelling guidance
```

Examples of detail that may be read from those owners when required:

```text
Geometry
→ masses / topology / dimensions / pivots / openings / motion readiness

Texturing
→ material cohorts / markings / alpha / emissive / PBR / atlas relations

Animation
→ moving chains / hierarchy / pivots / axes / contact / clearance / pose timing
```

Do not eagerly serialize those full structures into every Control packet merely because they exist.

## Projection Selection

Control selects exactly one active semantic domain:

```text
Geometry / hierarchy / pivots / UV readiness
→ GEOMETRY_CONTEXT

Texture / atlas / material / PBR / paint
→ TEXTURE_CONTEXT

Animation / timeline / controller / effects / particle motion context
→ ANIMATION_CONTEXT
```

If ownership is ambiguous, resolve the owner first. Do not send all three contexts as a hedge.

Pixel Art is intentionally **not** a Control authoring domain. It is a Reference Preparation specialist. When a Pixel Art artifact becomes production evidence, Control projects only the compact facts the active authoring stage needs.

## Pixel Art Handoff Rule

A Pixel Art artifact may be consumed by Texturing, Particle, or another downstream workflow without loading the Pixel Art knowledge corpus into Control.

Canonical handoff shape is compact and evidence-oriented:

```text
artifact identity / reference id
target mode: GENERIC_PIXEL | MINECRAFT_NATIVE | MIVUBI_HD_PIXEL
grid / dimensions when material
style-lock fields that affect production
palette/material roles when material
alpha / background requirement
identity-critical landmarks / fidelity constraints
animation frame contract when relevant
known blockers / provisional facts
```

For Texturing:

```text
approved pixel-art artifact
→ TEXTURE_CONTEXT receives relevant image/reference identity + material/style constraints
→ lazydesigner-texturing owns UV / atlas / mapped-surface implementation
```

For Particle texture use:

```text
approved pixel-art texture artifact
→ consuming Particle workflow receives texture identity + required alpha/grid/style facts
→ Particle authoring owns emitter/lifecycle/Molang/VFX semantics
```

Control must not serialize `docs/02-reference/pixel-art/**`, the Pixel Art Skill, cluster theory, palette theory, or generation history into an authoring packet. Those are upstream production rules, not downstream runtime state.

If the downstream stage only needs the produced image, pass/reference the image and the smallest semantic constraints that can change implementation.

## Research-derived authoring knowledge boundary

Research-derived modelling intelligence belongs with its durable domain owner and hot-path specialist/profile projection, not inside Control packet fields.

```text
durable rule
→ docs/03-authoring/**

hot-path execution trigger
→ active specialist Skill

asset-class nuance
→ exactly one selected modelling profile

Control
→ only selects/transports those owners
→ does not serialize their prose into stage_context
```

In particular, ownership-reuse, smallest-changed-branch, Locator-parent-motion, family-attachment, or rig/clip/controller-budget guidance must **not** become new `stage_context` fields, a second reasoning schema, or duplicated packet prose.

Animation receives resolved participating rig/relationship evidence plus the Animation Skill; it does not reload the full selected modelling profile merely because the asset has one.
## Geometry Profile Rule

Only Geometry normally loads a full modelling profile:

```text
lazydesigner-modelling
+ exactly one selected profile
```

Texturing and Animation receive the selected profile as a compact label only. They consume explicit material/motion relationships from relevant stage evidence instead of reopening full Geometry profile prose.

## Correction Projection

For bounded corrections, preserve the original intent and project only the changed decision boundary:

```text
current_user_delta
+ current context identities/hashes
+ affected stage evidence
+ current Workspace/Runtime state
→ continue
```

Do not reconstruct the initial package or resend unrelated approved information.

Examples:

```text
wheel placement correction
→ GEOMETRY_CONTEXT + affected geometry evidence/state

logo/material correction
→ TEXTURE_CONTEXT + affected surface/reference evidence

pixel-art palette correction already reflected in approved reference artifact
→ TEXTURE_CONTEXT + current artifact/reference identity + affected material constraints
→ do not reload Pixel Art corpus

knee gap during walk
→ ANIMATION_CONTEXT + affected motion evidence
→ Geometry handoff only when ownership proves structural
```

## Authority Rules

Projection does not create truth.

```text
explicit current user requirement
→ task authority

approved reference image(s) / pixel-art artifact
→ visual authority

Reference Package metadata/document
→ evidence-backed structured authority

workspace / Runtime
→ current authored-state authority

domain docs
→ durable semantic policy

Skill/profile
→ execution procedure / reusable specialist guidance

Control projection
→ selection / transport only
```

Control may normalize names and select subsets, but must not invent missing facts or promote provisional evidence.

## Freshness

Mutations stale only affected evidence.

```text
Geometry resize affecting mapped surfaces
→ affected UV / Texture evidence stale

Texture mutation
→ Geometry evidence remains fresh

participating pivot/hierarchy mutation
→ affected Animation evidence stale

Animation key mutation
→ Geometry/UV remain fresh unless a structural blocker is discovered
```

A revised upstream Pixel Art artifact stales only downstream evidence that actually depends on the changed visual/material facts. It does not globally invalidate Geometry or unrelated authoring state.

Do not globally invalidate all context after a bounded mutation.

## Readiness

Stage readiness is local to the active decision:

```text
READY
NEEDS_REVIEW
BLOCKED
```

A future-stage missing detail must not block an earlier legal stage.

## Context Identity / Reuse

Control uses content-addressed handles and `context_hash` so unchanged Skill/profile/context can be reused rather than retransmitted.

Hash/identity is an efficiency aid, not live-state proof. Workspace/Runtime freshness rules still apply.

## Non-Goals

Control projection must not become:

```text
second Reference Package
second persistent asset database
copy of whole Skills
copy of Tool schemas
per-Cube / per-pixel / per-keyframe plan
Pixel Art authoring engine
permanent workflow engine
all-context bundle
```

## Completion Contract

Projection is correct when:

```text
one active stage context is selected
packet remains compact and self-contained for orientation
large semantic detail stays with its canonical owner until needed
only Geometry receives one full selected profile
Pixel Art remains upstream reference ownership, not a new Control stage
approved Pixel Art evidence is projected only as compact downstream constraints
user intent remains unchanged
blockers remain explicit
bounded mutations invalidate only affected evidence
unchanged context can be reused by identity/hash
```

Control remains selector/router. Codex remains the reasoning/authoring agent. Skills remain execution specialists. Domain docs remain durable semantic authorities.
