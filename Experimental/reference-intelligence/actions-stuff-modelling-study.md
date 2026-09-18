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

## Case-Level Audit — Bow / Crossbow / Trident / Helmet

### Bow

The `minecraft:bow` attachable exposes **30 geometry variants**.

Across those variants:

- the stable common semantic chain is `root → bgzlujc → ghykezk`;
- most variants contain only **1 visible cube**;
- variants commonly add only one extra non-visual/helper owner such as `kqxjqkd`, `tzzbrom`, or `kkosjix`;
- four distinct hierarchy signatures cover all 30 geometry variants.

Observed signature distribution:

```text
14 variants: root → bgzlujc → ghykezk → kqxjqkd
 7 variants: root → bgzlujc → ghykezk
 7 variants: extra root/helper + root → bgzlujc → ghykezk
 2 variants: root → bgzlujc → ghykezk → tzzbrom
```

The bow attachable maps six animation/controller entries. Direct animation clips target only the small semantic/helper set: `kqxjqkd`, `bgzlujc`, and `tzzbrom`.

### Crossbow

The `minecraft:crossbow` attachable exposes **19 geometry variants**.

Common variant forms are similarly small:

```text
7 variants: helper + root + bgzlujc + kqxjqkd
5 variants: root + bgzlujc
4 variants: extra helper + root + bgzlujc
```

Most variants contain only **1 visible cube** while using several non-visible owners for presentation/state relationships.

Crossbow animation mappings separate first-person and non-first-person presentation and reuse the same compact helper set.

### Safe modelling conclusion

These assets strongly demonstrate:

> visual/presentation variant count can be high while the semantic helper skeleton stays small.

Therefore:

```text
many visual variants
!=
many unrelated rigs
```

and:

```text
state/presentation change
→ prefer stable semantic ownership
→ swap only the smallest geometry/helper branch that materially changes
```

This is stronger evidence for the existing `STATE` + `ATTACHMENT` reasoning, not a new responsibility category.

### Trident

The `minecraft:trident` attachable exposes four geometry variants.

Representative default geometry:

- 2 bones;
- 17 cubes;
- one parent/child chain.

Other presentation variants reduce to four cubes plus a helper/root relationship.

Safe lesson:

> view/presentation variants may simplify visible geometry while preserving the semantic item relationship.

Do not infer exact gameplay-state meaning from opaque variant aliases.

### Sword Presentation

A representative sword attachable demonstrates an even stronger separation between **presentation skeleton** and visible volume:

- several geometry variants contain **zero visible cubes** while retaining 2–4 non-visible bones;
- another variant adds only one visible cube under the same root/presentation chain.

This is direct evidence that non-visible geometry owners can exist purely to preserve authored transform/presentation relationships.

### Helmet

The `minecraft:turtle_helmet.player` attachable uses:

- 8 bones;
- 7 cubes;
- hierarchy depth 2;
- two non-visible owners;
- a dedicated `head` root;
- roughly 20 animation/controller mappings.

Safe lesson:

> worn assets can keep their own compact semantic hierarchy while following the wearer through a stable attachment owner.

This reinforces `ATTACHMENT` without implying that every armor item needs its own complex rig.

## Case-Level Pattern — Variant Skeleton Stability

Status: `PATTERN`.

Across bow/crossbow/trident/sword cases:

```text
semantic item relationship
→ stable compact transform/helper skeleton

visual state / presentation variant
→ minimal geometry/helper substitution
```

This is a concrete anti-duplication pattern for LazyDesigner.

Do not copy the opaque bone names; the relevant evidence is structural.

## Current Verdict

Actions & Stuff is accepted as a high-value analysis-only corpus for:

- humanoid/player animation reuse;
- held/worn asset presentation;
- attachable modelling;
- presentation variants;
- animation/controller composition.

No gameplay logic or opaque distribution naming is admitted as LazyDesigner knowledge.
