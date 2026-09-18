# Actions & Stuff 1.4 — Blockbench Modelling Study

Status: `OBSERVATION` / `PATTERN` extraction only. Analysis-only external corpus.

## Scope

Only modelling-relevant evidence is considered:

- player/humanoid animation structure;
- geometry/animation ownership;
- attachables;
- held/worn presentation;
- animation-controller composition;
- render relationships needed to understand authored assets.

Gameplay/runtime behavior outside asset presentation is ignored.

## Corpus Scale

Observed supplied resource archive:

- about 2349 geometry definitions;
- about 1896 animation clips;
- about 468 animation controllers;
- about 2911 attachable definitions;
- large render-controller surface;
- extensive texture variants.

Scale is not a quality score.

## Player Presentation Structure

The `minecraft:player` client entity maps a large animation vocabulary into one player presentation surface.

Observed:

- more than 300 animation aliases/mappings;
- multiple conditional animation layers in the player animate script;
- separate first-person, third-person, paperdoll, local-player, and cape-related presentation conditions;
- movement clips animate semantic player bones such as `waist`, `body`, `head`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `root`, and `cape`.

Representative clip scopes:

- locomotion-style clips touch roughly 8 semantic bones;
- swim is split into arm and leg responsibilities;
- several action clips touch 7–9 bones;
- mirrored left/right action clips can use the same broad bone set with different authored motion.

### Modelling lesson

A single humanoid rig can support a large motion vocabulary when:

- semantic bone roles remain stable;
- action clips reuse those owners rather than inventing per-action hierarchy;
- first-person / third-person differences are presentation decisions, not separate base rigs.

This strengthens:

> animation variety should normally reuse a stable semantic rig; new bones are justified by transform/attachment/deformation responsibility, not by clip count.

## Attachables as First-Class Authoring Surface

Observed semantic item identifiers include standard Minecraft items such as bows, crossbows, swords, axes, and helmets.

Representative findings:

- one bow attachable maps many geometry variants inside a single presentation definition;
- bow presentation includes multiple animation mappings and controller references;
- item-slot / first-person / main-hand / off-hand conditions influence presentation;
- helmets can use dedicated head geometry with a head pivot;
- several hand-held tools share a common geometry family rather than each inventing a completely independent rig;
- some attachable geometry includes non-visible helper bones even when visible cube count is extremely small.

### Modelling lesson

```text
one semantic item
can have
multiple presentation variants
without
multiple unrelated authoring systems
```

Variant presentation should reuse common semantic ownership where possible.

## Geometry Variant Lesson

The bow attachable exposes many geometry variants under one semantic item. The exact meanings of many internal variant names are obfuscated and therefore are not inferred.

Safe generic conclusion:

> multiple visual states/presentation variants can share one attachable contract while swapping only the geometry/animation/render piece that materially changes.

Do not infer state semantics from hashed/opaque identifiers.

## First-Person vs Third-Person

The same authored object/player system can use different transform/animation presentation depending on camera context.

LazyDesigner implication:

- authoring should be able to prepare assets for alternate presentation transforms;
- this does not justify duplicating base geometry unless silhouette/form actually changes;
- attachment owner, scale/orientation, and clip selection may differ per presentation context.

## Stable Rig, Broad Clip Library

Observed player movement/action clips reinforce:

```text
stable rig
+
broad clip library
+
presentation conditions
```

rather than:

```text
new action
→ new hierarchy
```

This is strong evidence against action-driven over-rigging.

## Negative Pattern

Many distributed identifiers are obfuscated.

Do not promote:

- hashed file names;
- opaque animation aliases;
- compressed distribution naming;

into LazyDesigner semantic naming.

Only use human-readable semantic bone roles and structurally verifiable relationships as authoring evidence.

## Cross-Domain Candidate Rules

### A1 — Stable semantic rig across action families

Status: `CANDIDATE_RULE`.

Reuse the same semantic anatomy/ownership graph across locomotion, swimming, actions, held-item states, and presentation variants unless a real transform/deformation requirement needs another owner.

### A2 — Presentation variant != base-rig variant

Status: `CANDIDATE_RULE`.

First-person, third-person, main-hand, off-hand, worn, or alternate visual state may require different transform/animation/geometry selection without requiring an unrelated base hierarchy.

### A3 — Attachable contract is an attachment/presentation owner

Status: `PATTERN`.

Held/worn objects should be reasoned through explicit attachment/presentation relationships, reinforcing the existing `ATTACHMENT` responsibility vocabulary.

## Current Verdict

Actions & Stuff is accepted as a high-value analysis-only corpus for:

- humanoid/player animation reuse;
- held/worn asset presentation;
- attachable modelling;
- presentation variants;
- animation/controller composition.

No gameplay logic or opaque distribution naming is admitted as LazyDesigner knowledge.
