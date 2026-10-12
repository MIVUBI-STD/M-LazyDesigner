---
name: lazydesigner-prompt-compiler
description: Delegated-only helper inside LazyDesigner Reference Preparation. Normalize current user intent, confirmed answers, and approved decisions into one clean production brief without inventing requirements. Do not route here independently for generic rewriting, repository development, or normal asset authoring.
---

# LazyDesigner Prompt Compiler

## Activation Contract

```text
LANE: IN_USE
DOMAIN: REFERENCE_PREPARATION
CLASS: DELEGATED
OWNER: REFERENCE_PROMPT_NORMALIZATION
```

Enter only when delegated by `lazydesigner-reference-preparation` because normalization materially helps. This is not a top-level router, generic writing Skill, product-development Skill, or authoring-stage specialist.


This Skill runs only inside ChatGPT-side Reference Preparation. Its purpose is to prevent weak, fragmented, casual, typo-heavy, or contaminated conversation context from becoming the direct generation prompt.

## Core Rule

```text
RAW USER INPUT
+ CONFIRMED ANSWERS
+ APPROVED PRIOR DECISIONS
→ CLEAN PRODUCTION BRIEF
```

The compiled brief is an execution representation of user intent, not a new creative authority.

## Hard Boundary

The compiler may:
- normalize wording;
- deduplicate repeated instructions;
- resolve pronouns/references from confirmed context;
- convert casual language into concise technical language;
- preserve explicit constraints;
- separate required vs optional details;
- preserve approved reference identity;
- express unresolved information as UNKNOWN.

The compiler must not:
- invent exact dimensions or source measurements;
- present missing source material, hidden geometry or attachment details as observed;
- override approved images, explicit user constraints, or source-backed identity;
- silently choose between materially conflicting requirements;
- convert a creative choice or guess into a source-backed requirement.

For a **new creative design** without a source-fidelity constraint, the brief may contain restrained, reversible choices for unspecified color, material, decoration and non-critical form. Mark these as creative defaults rather than confirmed source facts. For **source reconstruction**, keep unknown source features unknown; do not hallucinate them. This distinction is based on user intent and evidence, not a separate engine or persistent mode.

## Input Gate

Do not compile a production brief while a blocking requirement is unresolved.

Blocking information is anything that can materially change the generated target, such as:
- what the asset fundamentally is;
- the major subtype when needed for identity;
- a required style/reference direction when the user needs one specific outcome and no safe default can satisfy the request;
- dimensions when scale is required for the requested handoff;
- animation YES/NO when it changes reference preparation;
- critical attachment, orientation, part-count, or action information;
- any explicit user-specific requirement that is still ambiguous.

When blocking information is missing, return `NEEDS_USER_INPUT` with only simple user-facing questions.

## Question Style

Questions must be easy to answer without technical knowledge.

Prefer:
- short multiple-choice wording when useful;
- familiar object terms;
- one concise batch of the fewest decision-changing questions.

Avoid asking users for topology, pivot matrices, UV strategy, deformation terminology, or other implementation language.

Example:

```text
Instead of:
"Define articulation topology and pivot ownership."

Ask:
"Bagian mana yang perlu bergerak? Misalnya tangan, pintu, roda, atau tidak ada."
```

## Compiled Brief Contract

The internal brief should distinguish confirmed/evidence-backed facts from reversible creative defaults:

```text
ASSET
PROFILE
GOAL
VISUAL TARGET
REQUIRED FEATURES
DIMENSIONS
ANIMATION REQUIREMENT
REFERENCE AUTHORITY
STRUCTURAL PRIORITIES
MATERIAL PRIORITIES
MOTION PRIORITIES
PRESERVE
CREATIVE DEFAULTS (only for open-ended generation; never source facts)
UNKNOWN / NON-BLOCKING
```

Omit empty sections when they do not help execution.

## Context Hygiene

Do not pass the entire raw conversation as the generation prompt when a compiled brief can represent the current approved state.

For corrections, compile a delta:

```text
CHANGE
PRESERVE
AFFECTED REFERENCE MODULES
NEW BLOCKERS
```

Old rejected directions must not remain active merely because they occurred earlier in chat.

## Output to Reference Preparation

Return the smallest current brief necessary to generate or edit the image. Produce a short `CONFIRMATION_SUMMARY` only when the user explicitly requested pre-generation review. No mandatory confirmation summary is generated for a clear direct image request.

Do not generate images, JSON, Markdown package files, or other artifacts from this delegated Skill.

## Completion

Return one of:

```text
NEEDS_USER_INPUT
READY_FOR_GENERATION
```

`NEEDS_USER_INPUT` applies to a blocking ambiguity or user-requested approval-first review. `READY_FOR_GENERATION` means the direct user request authorizes generation and the brief is sufficiently resolved. Final reference approval still follows inspection of the resulting visual when material.
