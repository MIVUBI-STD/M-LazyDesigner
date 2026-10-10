# Reference Package

Canonical Codex handoff documentation. The optional [Particle Handoff](particle-handoff.md) specializes the existing `REFERENCE.json` package; it does not create another format, stage, or Control route.

```text
schema.md          REFERENCE.json structure, stable facts, scale, readiness
handoff.md         ChatGPT Reference Preparation → Codex boundary only
load-contract.md   minimal stage-specific consumption and fallback loading
geometry.md        GEOMETRY.md projection contract
texture.md         TEXTURE.md projection contract
animation.md       ANIMATION.md projection contract
particle-handoff.md optional particle specialization of the same handoff
```

## AI Read Rule

```text
building/validating REFERENCE.json
→ schema.md

handing package from ChatGPT to Codex
→ handoff.md

Codex deciding what package content to load
→ load-contract.md

working on one stage projection
→ only that stage document
```

Do not read Geometry, Texture, and Animation contracts together unless the task genuinely spans all three.

Stage Markdown files are optional when they add no material value. `REFERENCE.json` remains the package entry point and may route stage-relevant images through `images.used_by` even when a stage Markdown file is absent.

## Pixel Art Handoff Boundary

Pixel Art remains a Reference Preparation capability, not a fourth asset-authoring stage.

A pixel-art asset may enter a downstream package as ordinary approved reference evidence when it materially informs Geometry, Texturing, Animation, or Particle work. Do not add a parallel `PIXEL_ART.md`, Pixel Art stage gate, or Pixel Art Control phase merely because a package contains a pixel-art image.

```text
standalone pixel-art result
→ may stop in Pixel Art domain

pixel-art result needed by mapped model texture
→ include only the approved artifact + compact visual constraints
→ Texturing remains production owner

pixel-art result needed by particle texture
→ include only texture/frame visual facts
→ Particle remains runtime/effect owner
```

The exact compact Pixel Art handoff fields are owned by `../pixel-art/delivery.md`. Package schema should reference the artifact through existing image/reference mechanisms unless a proven downstream requirement justifies a schema change.
