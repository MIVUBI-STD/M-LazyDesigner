# Reference Preparation Policy

**Status:** Active Policy  
**Updated:** 2026-09-11

This file owns durable Reference Preparation principles only. It stays compact and does not duplicate child contracts.

## Purpose

Reference Preparation turns user intent and source evidence into an approved Minecraft/Blockbench target plus a compact package that lets Codex author without avoidable guessing.

```text
USER INTENT / SOURCE EVIDENCE
→ REQUIREMENT RESOLUTION
→ APPROVED TARGET AUTHORITY
→ REFERENCE PACKAGE
→ CODEX AUTHORING
```

Operational flow: `flow.md`  
Image rules: `image/README.md`  
Package rules: `package/README.md`

## Typed Authority Model

Authority is **typed by fact**, not one simplistic global ranking.

```text
explicit current user requirement
→ highest task authority

approved visual reference
→ visible identity / silhouette / proportion / material appearance authority

confirmed numeric dimensions
→ numeric envelope authority

confirmed player-relative scale
→ world / interaction / occupancy scale authority

REFERENCE.json
→ structured record of confirmed facts, relationships, unknowns and readiness

stage Markdown
→ stage-specific consequences only

Codex
→ downstream interpretation / implementation reasoning
```

A weaker layer may clarify but may not override its stronger owner.

When two strong authorities materially conflict—for example approved visual proportions vs explicit dimensions—do not silently choose one. Preserve the conflict and block only the dependent decision until resolved.

## Evidence Rule

Use only evidence that actually exists.

```text
visible source evidence → may support a visual claim
missing / conflicting evidence → UNKNOWN or ask when blocking
```

Do not infer exact dimensions from pixels or average conflicting views into invented geometry. For source-faithful reconstruction, do not invent hidden structure, materials, articulation, animation, or identity-critical facts. For an original creative concept, reversible choices about unspecified appearance are allowed; label them as design choices, never as observed evidence.

## Minimum-Sufficient Reference Rule

Reference Preparation is not a presentation-board workflow.

```text
minimum evidence that materially reduces downstream uncertainty
```

A user-supplied image may already be sufficient. Generate additional visual reference only when it resolves a material ambiguity or creates a clearer approved Minecraft target.

Generated sheets follow `image/standard.md`.

## Minecraft Target Rule

When starting from real-world or non-Minecraft evidence, final production reference sheets normally show the approved **Minecraft/Blockbench interpretation only**. The original source remains separate evidence when needed.

## Scale Rule

All sizing is anchored to Minecraft player/world scale unless stronger explicit dimensions exist.

Canonical rules: `image/scale-and-escalation.md`.

Numeric dimensions and player-relative scale have distinct roles:

```text
numeric dimensions       → exact envelope where confirmed
player-relative scale    → world / interaction relationship
```

A relative category never authorizes invented exact block values.

## Identity / Scale Anti-Drift

Sheet 01 establishes visual identity and scale locks. Later sheets may elaborate but may not silently redesign or rescale the asset.

A material change to locked identity, scale, major silhouette, part count, material identity, asymmetry, accessories, or construction logic is a revision and must update affected evidence coherently.

## Profile Rule

Reference Preparation and Authoring share one profile vocabulary:

```text
PROP_FURNITURE
VEHICLE
HUMANOID
CREATURE
MECHANICAL
PLANT_FOLIAGE
GENERIC
```

Profiles are knowledge overlays, not templates or geometry presets. `GENERIC` is fallback only.

Authoring profile details live under `../03-authoring/modelling/profiles/`.

## Unknown / Readiness Rule

Unknowns are:

```text
blocking
non_blocking
```

A blocking unknown can materially change the next legal decision. Non-blocking unknowns remain visible without stopping unrelated work.

Readiness is stage-specific:

```text
READY
NOT_REQUIRED
NEEDS_REVIEW
BLOCKED
```

Missing Texture evidence does not block Geometry unless it changes a Geometry decision.

## Image / Metadata Boundary

```text
image     → visual authority
JSON      → structured facts / relations / scale / readiness / unknowns
Markdown  → stage-specific explanation only where useful
```

Do not turn images into technical manuals. Do not turn metadata into prose duplicates of images.

## Package Boundary

Normal package:

```text
REFERENCE.json
GEOMETRY.md
TEXTURE.md      only when useful
ANIMATION.md    only when useful / required
approved/supporting image(s)
```

Canonical package owners: `package/README.md`.

Do not export transcripts, compiled prompt history, generic tutorials, Tool schemas, or Cube-by-Cube implementation plans.

## Approval Rule

A generated visual becomes approved visual authority only after explicit user acceptance when visual approval is material.

A fresh material change requires review of the resulting visual before it replaces approved reference authority. A clear user request to generate or revise an image does not require redundant pre-generation confirmation. Only an explicitly requested pre-generation approval or an unresolved blocking decision requires waiting; never infer approval from silence.

## Completion

Reference Preparation is complete when:

```text
blocking information for the intended next stage is resolved
approved visual authority exists when required
scale authority is sufficiently anchored
strong authorities do not contain unresolved material conflict
only useful reference evidence is present
unknowns/readiness are explicit
package consistency passes
no unsupported fact was invented
```

Then stop. Downstream implementation belongs to LazyDesigner authoring.