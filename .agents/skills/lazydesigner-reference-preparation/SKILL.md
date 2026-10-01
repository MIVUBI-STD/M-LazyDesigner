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

Load only the branch owner that can change the next decision:

```text
reference flow/policy → docs/02-reference/flow.md + policy.md
visual/model          → docs/02-reference/image/README.md
pixel art             → lazydesigner-pixel-art-authoring + docs/02-reference/pixel-art/README.md
particle/VFX          → lazydesigner-particle-reference-authoring + docs/02-reference/particle/README.md
package/handoff       → docs/02-reference/package/README.md
```

Prompt normalization is delegated to `lazydesigner-prompt-compiler`. Do not preload branch corpora or maintain parallel copies of their detailed contracts here.

## Boundary

Reference Preparation owns requirement clarification, branch selection, visual/model reference coordination, specialist delegation, review coordination, and package gating.

It does **not** own Blockbench Geometry/Texturing/Animation mutation, exact Cube/pivot/UV plans, Runtime Tool planning, MCP/Gateway implementation, or unobserved Minecraft/Blockbench truth.

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

Classify missing information as `BLOCKING | USEFUL | OPTIONAL`. Resolve only `BLOCKING` unknowns that can materially change identity, primary structure, scale/viewing distance, required motion/articulation, target grid/style mode, or another major branch decision.

Ask the fewest simple decision-changing questions. Never ask the user for topology, pivot ownership, UV strategy, Molang implementation, or prompting terminology.

### Pixel-art fast path

No BLOCKING pixel-art ambiguity → delegate directly to `lazydesigner-pixel-art-authoring`. Do not treat the word `pixel` as sufficient classification: actual Blockbench atlas/UV/Painter mutation belongs to `lazydesigner-texturing`.

### Particle-only exception

Particle/VFX work **does not inherit the image branch's hard pre-generation confirmation ceremony**. No BLOCKING particle ambiguity → delegate directly to `lazydesigner-particle-reference-authoring` and allow only reversible `PROVISIONAL` non-blocking choices. Do not guess hidden geometry, runtime truth, or performance.

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

Use the minimum evidence that reduces downstream uncertainty. Possible modules remain `CONCEPT | TURNAROUND | STRUCTURAL_DETAIL | MATERIAL_TEXTURE | RIG_DEFORMATION | POSE_ACTION | EXPRESSION_FACE | ANIMATION_KEYFRAME`; **do not generate every module by default**.

`docs/02-reference/image/standard.md` owns panel economy and layout; `scale-and-escalation.md` owns player/world scale and multi-sheet escalation; prompt construction remains in `prompt-contract.md` + `master-templates.md`.

Sheet 01 is the identity/scale anchor when a sheet workflow is needed; Sheet 02+ exists only for real information overflow. Every panel must reduce Geometry, Texture, or Animation ambiguity. Corrections use **CHANGE + PRESERVE against approved authority**.

A generated visual becomes approved visual authority only after explicit user acceptance when visual approval is material.

## Pixel-art branch

Delegate deliberate integer-grid icons, object/prop pixel art, sprites, tiles/patterns, reference conversion, and Minecraft-native/MIVUBI HD pixel references to `lazydesigner-pixel-art-authoring`.

Do not preload smooth image-reference modules for pixel-art-only work. Pixel Art may hand a visual artifact to Texturing or Particle, but ownership immediately returns to the consuming specialist for UV/atlas or particle runtime semantics.

## Particle/VFX branch

Delegate standalone Bedrock/Snowstorm particle-reference authoring to `lazydesigner-particle-reference-authoring`. Image/model references are optional evidence, never a mandatory prerequisite.

A validated `.particle.json` + required texture can stop at review. Manifest/README/ZIP/`REFERENCE.json` are delivery outputs and are not created merely because first-pass authoring completed.

## Package gate

Package only when the user explicitly requests handoff/package delivery or it is already unambiguous in the current instruction. Otherwise stop at the reviewed branch artifact.

Visual/model packaging uses `docs/02-reference/package/`; Pixel Art follows its selected delivery contract; Particle follows `docs/02-reference/particle/delivery.md`. Do not export conversation history, scratch QA, duplicate bootstrap files, or unrelated branch artifacts.

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
