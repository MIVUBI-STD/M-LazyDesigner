---
name: lazydesigner-reference-preparation
description: In-use ChatGPT reference-preparation router for LazyDesigner. Resolve only decision-changing requirements, select exactly the needed visual/pixel-art/particle branch, coordinate review, and package only when requested. Do not use for repository/plugin development, Blockbench mutation, or normal Codex asset-authoring stages.
---

# LazyDesigner Reference Preparation

## Activation Contract

```text
LANE: IN_USE
DOMAIN: REFERENCE_PREPARATION
CLASS: ROUTER
OWNER: REFERENCE_CAPABILITY_SELECTION
```

Enter for preparing reference evidence before optional downstream authoring. Select only the branch that materially changes the next decision; do not preload siblings. Do not inspect or modify LazyDesigner implementation source because a reference result is weak. Proven system defects cross lanes through a bounded `DEVELOPMENT_HANDOFF`; ordinary reference-quality correction stays in this lane.


Single ChatGPT-side orchestration authority for preparing references before optional downstream Codex/LazyDesigner authoring. It routes to existing canonical owners rather than duplicating them.

## Route

```text
USER REQUEST
→ UNDERSTAND
→ REQUIREMENT GATE
→ resolve BLOCKING unknowns only
→ PROMPT COMPILER when normalization helps
→ CLASSIFY CAPABILITY
   ├─ VISUAL / MODEL
   │  → bounded final confirmation when material
   │  → image reference owners
   │  → image QA / user visual approval
   ├─ PIXEL ART
   │  → lazydesigner-pixel-art-authoring
   │  → integer-grid / silhouette / cluster / palette contract
   │  → pixel QA / review
   ├─ PARTICLE / VFX
   │  → lazydesigner-particle-reference-authoring
   │  → no ceremonial pre-confirmation when no BLOCKING ambiguity remains
   │  → particle QA / target-environment review when material
   └─ COMPOSED
      → use each branch only for the dependency it owns
→ PACKAGE ONLY WHEN REQUESTED
→ CONSISTENCY GATE when a package/handoff exists
→ OPTIONAL DOWNSTREAM HANDOFF
```

## Canonical owners

```text
ChatGPT reference flow
→ docs/02-reference/flow.md

Durable reference policy
→ docs/02-reference/policy.md

Prompt normalization
→ .agents/skills/lazydesigner-prompt-compiler/SKILL.md

Visual/model reference entry
→ docs/02-reference/image/README.md

Visual reference standard
→ docs/02-reference/image/standard.md

Scale + sheet escalation
→ docs/02-reference/image/scale-and-escalation.md

Image-generation prompt contract
→ docs/02-reference/image/prompt-contract.md

Image master templates
→ docs/02-reference/image/master-templates.md

Pixel-art reference entry
→ docs/02-reference/pixel-art/README.md

Pixel-art specialist
→ .agents/skills/lazydesigner-pixel-art-authoring/SKILL.md

Particle/VFX reference entry
→ docs/02-reference/particle/README.md

Particle/VFX specialist
→ .agents/skills/lazydesigner-particle-reference-authoring/SKILL.md

Reference package contracts
→ docs/02-reference/package/README.md
```

Do not maintain parallel copies of detailed image, pixel-art, particle, or package contracts in this Skill.

## Boundary

ChatGPT Reference Preparation owns:
- requirement clarification;
- prompt normalization when useful;
- branch selection;
- image-reference planning/generation/editing for the visual branch;
- pixel-art delegation for strict grid-authored icons/sprites/tiles/reference conversion;
- particle-reference delegation for the particle branch;
- branch-specific QA coordination;
- package creation only when requested.

It does **not** own:
- Blockbench modelling implementation;
- exact Cube coordinates/counts;
- exact pivots or UV placement;
- Runtime Tool call planning;
- final animation key authoring;
- MCP/Gateway implementation;
- live Minecraft/Blockbench truth unless actually observed.

## Input authority

Accept text, user image(s), text + image(s), previously approved references, or bounded corrections.

Resolve facts in this order:

```text
explicit current user requirement
→ visible source evidence
→ approved prior target decision
→ canonical branch rules
→ unresolved remains UNKNOWN
```

Never infer numeric scale from pixels. Never silently average materially conflicting evidence.

## Requirement gate

Classify missing information:

```text
BLOCKING
USEFUL
OPTIONAL
```

`BLOCKING` means the answer can materially change identity, primary structure, scale/viewing distance, required articulation/motion, target grid/style mode, or another major output decision.

When BLOCKING information is missing:
- do not generate/author the affected branch yet;
- ask only the fewest decision-changing questions;
- use basic user-facing wording;
- never ask the user for topology, pivot ownership, UV strategy, Molang implementation, or prompting terminology.

`USEFUL` is asked only when the expected gain is material. `OPTIONAL` remains unspecified unless evidence resolves it.

### Pixel-art fast path

Pixel-art work does not require visual/model-sheet ceremony when the output contract is already clear.

```text
BLOCKING pixel-art ambiguity remains
→ ask minimum decision-changing question

no BLOCKING ambiguity remains
→ delegate directly to lazydesigner-pixel-art-authoring
→ choose conservative reversible grid/style decisions where allowed
→ author first pass
→ applicable pixel QA
→ user review when visual acceptance is material
```

Do not treat the word `pixel` as sufficient classification. If the request is actual Blockbench atlas/UV/Painter mutation, it belongs to LazyDesigner Texturing, not Pixel Art Reference Authoring.

### Particle-only exception

Particle/VFX work does **not** inherit the image branch's hard pre-generation confirmation ceremony.

```text
BLOCKING particle ambiguity remains
→ ask minimum question

no BLOCKING particle ambiguity remains
→ delegate directly to lazydesigner-particle-reference-authoring
→ allow conservative reversible PROVISIONAL choices under particle/authoring-spec.md
→ author first pass
→ relevant static QA
→ user target-environment review when material
```

This exception applies only to particle/VFX authoring. It does not permit guessing hidden geometry, runtime truth, exact performance, or other blocking facts.

## Prompt compiler

After blocking information is resolved, use `lazydesigner-prompt-compiler` when normalization materially helps.

The compiler may organize, normalize wording, remove superseded directions, and deduplicate. It may not invent dimensions, materials, topology, animation requirements, hidden structure, motion, target grid/style identity, or unsupported design choices.

The compiled brief is internal working state and is not exported by default.

## Visual/model confirmation — hard gate when material

For a new **visual/model** artifact whose target materially depends on user decisions, show a concise confirmation and obtain explicit approval before image generation.

Preferred shape:

```text
Konfirmasi sebelum dibuat:
- Objek: <asset>
- Skala: <only when material>
- Arah: <main target>
- Tambahan: <only material extras>

Sudah sesuai?
```

Silence is not approval. A materially revised visual target requires another bounded confirmation.

Do not apply this ceremony automatically to Pixel Art or Particle requests that already have no BLOCKING ambiguity.

## Visual/model branch

Use the minimum evidence that reduces downstream uncertainty.

Possible modules:

```text
CONCEPT
TURNAROUND
STRUCTURAL_DETAIL
MATERIAL_TEXTURE
RIG_DEFORMATION
POSE_ACTION
EXPRESSION_FACE
ANIMATION_KEYFRAME
```

Do not generate every module by default. `docs/02-reference/image/standard.md` owns panel economy and layout. `scale-and-escalation.md` owns player/world scale and multi-sheet escalation. `prompt-contract.md` + `master-templates.md` own prompt construction and identity/scale locks.

Core visual rules:
- Sheet 01 is the identity/scale anchor when a sheet workflow is needed;
- Sheet 02+ exists only for real information overflow;
- every panel must reduce Geometry, Texture, or Animation ambiguity;
- content decides layout, not the reverse;
- later sheets elaborate rather than redesign;
- corrections use CHANGE + PRESERVE against approved authority.

A generated visual becomes approved visual authority only after explicit user acceptance when visual approval is material.

## Pixel-art branch

Delegate to `.agents/skills/lazydesigner-pixel-art-authoring/SKILL.md` and `docs/02-reference/pixel-art/README.md`.

Use this branch for deliberate integer-grid assets such as:

```text
icon
object / prop pixel art
sprite / sprite animation
seamless tile / pattern
pixel-art reference conversion
Minecraft-native or MIVUBI HD pixel reference
```

Do not preload smooth image-reference modules for a pixel-art-only request unless a source image must be interpreted and the pixel specialist explicitly requires bounded image evidence.

Pixel Art may supply a texture image/reference to Particle or Texturing. Ownership then returns to the consuming specialist:

```text
Pixel Art → image / style artifact
Texturing → UV / atlas / mapped-surface production
Particle → emitter / lifecycle / Molang / VFX semantics
```

## Particle/VFX branch

Delegate to `.agents/skills/lazydesigner-particle-reference-authoring/SKILL.md` and `docs/02-reference/particle/README.md`.

Do not preload visual-reference modules for particle-only work. A new image reference is optional evidence, never a mandatory particle prerequisite.

Particle first-pass authoring may stop at validated `.particle.json` + required texture assets for review. A manifest, README, ZIP, or `REFERENCE.json` is delivery output and is not created merely because authoring completed.

## Package gate

Package generation requires one of:
- the user explicitly requests a package/handoff; or
- package delivery is already unambiguous in the current instruction.

Otherwise stop at the branch-specific reviewed artifact.

### Visual/model package

Use canonical owners under `docs/02-reference/package/`. Include only required files such as `REFERENCE.json`, `GEOMETRY.md`, optional `TEXTURE.md`, optional `ANIMATION.md`, and approved/supporting images.

### Pixel-art package

Follow the selected pixel-art delivery contract. Do not invent ZIP/atlas/manifest output merely because a pixel asset exists. Downstream handoff should carry only artifact identity, target mode, grid, style-lock fields, palette/alpha constraints and known blockers that affect the consumer.

### Particle/VFX package

Follow `docs/02-reference/particle/delivery.md`. Standalone user delivery is an ordinary Bedrock Resource Pack folder/ZIP. Add the canonical particle `REFERENCE.json` only for explicit LazyDesigner/Codex/MCP downstream handoff.

Do not export conversation transcript, compiled prompt history, scratch QA, duplicate bootstrap files, or unrelated reference branches.

## Unknown / readiness rule

Unknowns stay explicit. Readiness is stage-specific:

```text
READY
NOT_REQUIRED
NEEDS_REVIEW
BLOCKED
```

Missing information in one branch must not block an independent branch unless it changes that branch's actual decision.

## Completion

Reference Preparation is complete when:
- blocking information for the selected branch is resolved;
- any branch-specific required confirmation is explicit;
- only required reference capabilities were used;
- branch-specific QA is complete at the available proof ceiling;
- any requested package passes its consistency contract;
- no unsupported fact was invented.

Then stop. Downstream implementation belongs to Codex/LazyDesigner authoring Skills.
