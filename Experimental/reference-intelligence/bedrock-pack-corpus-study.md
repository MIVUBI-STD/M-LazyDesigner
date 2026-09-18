# User-Supplied Bedrock Pack Corpus — Blockbench Modelling Study

Status: `OBSERVATION` / `PATTERN` extraction on branch `Ref` only. Not production authority.

## Scope Lock

This corpus is used **only** to improve LazyDesigner / Blockbench MCP authoring knowledge.

In scope:

- geometry construction and decomposition;
- hierarchy / groups / bones;
- pivots and transform ownership;
- locators / attachment positions;
- UV layout;
- texture/material treatment where relevant to model authoring;
- animation clips;
- animation-controller composition where it affects authored visual assets;
- attachables / held-worn presentation;
- render relationships needed to understand asset presentation;
- visual validation and correction.

Out of scope:

- gameplay architecture;
- Script API design;
- mcfunction architecture;
- scoreboard/tag state machines;
- missions, menus, UI systems;
- world generation;
- recipes, loot, progression;
- server/game logic;
- map framework design;
- behavior-pack implementation except where needed only to understand an authored asset relationship.

If a source contains large non-modelling systems, those portions are ignored.

## Rights Boundary

Treat every uploaded archive as analysis-only unless redistribution rights are independently verified.

Do not copy third-party models, textures, animations, sounds, scripts, functions, or other payloads into LazyDesigner. Prefer derived measurements, independently expressed observations, and generic authoring principles.

## Corpus Triage

| Source | Modelling value for LazyDesigner | Keep / Ignore |
| --- | --- | --- |
| Bloom | furniture/environment geometry, plant/prop families, some animation | KEEP modelling slices only |
| Friendly Fishing | creature families, rods/held objects, attachables, animation families | KEEP |
| Realism Visuals | little direct Blockbench modelling value | DEFER / mostly ignore |
| Actions & Stuff 1.4 | geometry, player animation, attachables, animation controllers, render relationships | HIGH PRIORITY |
| Advanced Movement | animation families and motion/rig relationships | KEEP animation-facing slices |
| Advanced Truck Simulator | vehicle/trailer geometry, multipart mechanical rigging, animation/controllers | HIGH PRIORITY |
| Better on Bedrock 1.1 | varied entity/prop geometry and animation examples | KEEP selected assets only |
| TNT Arena | geometry/animation/controller examples only; gameplay logic ignored | KEEP selected visual assets only |

## S7 — Bloom

### Relevant modelling evidence

Observed archive contains a large set of Bedrock geometry definitions, including plant, furniture, environment, and prop-like assets, plus a smaller animation surface.

Useful study areas:

- simple furniture/environment prop decomposition;
- repeated plant/decorative families;
- static vs articulated ownership;
- geometry-vs-texture detail budgeting;
- consistency across asset families.

### Not used

All function/scoreboard/world-progression logic is outside scope and must not inform LazyDesigner.

## S8 — Friendly Fishing Add-On

### Relevant modelling evidence

Observed archive contains:

- about 257 geometry definitions;
- 246 animation clips;
- fish/animal families;
- rods and held-object presentation;
- fishermen/NPC-like assets;
- attachable-style presentation relationships.

### Useful modelling lessons

1. Related creature families should preserve shared structural conventions while allowing identity-specific silhouette variation.
2. Repeated fish variants are useful for studying when geometry can stay structurally similar and identity shifts into proportion/texture/detail.
3. Rod/held-object assets are useful for attachment/locator and hand-presentation study.
4. Small-creature animation families can help distinguish reusable rig topology from clip-specific motion.

### Not used

Recipes, worldgen, structures, gameplay/content systems are outside scope.

## S9 — Realism Visuals

### Current modelling relevance

Low.

The archive is primarily environment/render presentation rather than Blockbench model authoring.

Potentially relevant only if a concrete future modelling question needs:

- material/render interpretation;
- visual presentation context that affects how a model is judged.

Status: `DEFERRED_FOR_MODELLING`.

Do not use its biome/fog/lighting/world-render architecture as LazyDesigner knowledge.

## S10 — Actions & Stuff 1.4

### Relevant modelling evidence

Observed archive scale includes approximately:

- 2349 geometry definitions;
- 1896 animation clips;
- 468 animation controllers;
- 2911 attachable definitions;
- large render-controller surface;
- extensive texture variants.

### Why this is high-value

This is one of the strongest user-supplied sources for Blockbench-oriented knowledge because it connects:

```text
geometry
→ bones / pivots
→ animation clips
→ animation controllers
→ attachables
→ held / worn presentation
→ render relationships
```

### Priority study targets

- player/humanoid rig structure;
- held and worn item geometry;
- attachment/locator ownership;
- animation-controller composition from an artist-facing perspective;
- state-driven visual variants;
- geometry/texture separation;
- semantic consistency across many presentation assets.

### Negative pattern

Packaged/obfuscated/hashed names are distribution artifacts, not naming guidance.

Do not learn source naming style from opaque identifiers.

## S11 — Advanced Movement Add-on

### Relevant modelling evidence

Observed archive has only about five geometry definitions but around 212 animation clips.

Useful study areas:

- movement animation planning;
- jump / double-jump / flip / climb motion families;
- long staged motion sequences;
- how a small rig supports a rich animation set;
- animation responsibility without unnecessary geometry growth.

### Generic modelling lesson

```text
rich motion
!=
complex geometry
```

A compact rig can support many actions when hierarchy and pivots are appropriate.

### Not used

Script classes, gameplay state, movement implementation, and interaction logic are outside scope.

## S12 — Advanced Truck Simulator

### Relevant modelling evidence

Observed archive includes:

- about 548 geometry definitions;
- vehicle/trailer families;
- about 107 animation clips;
- about 140 animation controllers.

### High-value modelling targets

- rigid multipart vehicle decomposition;
- wheel / door / trailer / coupling transform ownership;
- mechanical pivots;
- coupled vs uncoupled presentation;
- vehicle attachment points;
- motion-ready hierarchy;
- mechanical clearance at animation extremes;
- repeated vehicle-family consistency.

### Candidate modelling principle

Vehicle complexity should be decomposed by actual mechanical responsibility, not by visual panel count.

### Not used

Mission logic, functions, Script API, UI, dynamic properties, and gameplay systems are outside scope.

## S13 — Better on Bedrock 1.1

### Relevant modelling evidence

Observed archive contains about:

- 222 geometry definitions;
- 258 animation clips;
- 51 animation controllers;
- varied entity and prop content.

### Useful modelling targets

- selected creature/entity rigs;
- props;
- animation-ready hierarchy;
- repeated asset family organization;
- visual-state variants where the model itself materially changes.

### Not used

Script modules, items/recipes, custom components, worldgen, gameplay features, and managers are outside scope.

## S14 — TNT Arena

### Relevant modelling evidence

Observed archive contains approximately:

- 179 geometry definitions;
- 964 animation clips;
- 201 animation controllers.

Despite its large gameplay implementation, only visual-authoring slices are relevant.

### Useful modelling targets

- selected animated props/entities;
- compact and large animation families;
- controller-to-clip organization;
- effect/locator relationships if directly tied to authored model presentation;
- hierarchy/pivot patterns for animated arena objects.

### Not used

All arena logic, scoreboard state, functions, round lifecycle, player assignment, reset logic, and command choreography are outside scope.

## Cross-Corpus Modelling Patterns

### M1 — Geometry complexity and animation complexity are independent

Advanced Movement shows very small geometry coverage with a large animation library. Actions & Stuff shows both large geometry and animation surfaces.

Therefore:

```text
model complexity
!=
animation complexity
```

Plan each from its actual requirement.

### M2 — Asset families should share conventions, not forced identical geometry

Friendly Fishing, Bloom, Actions & Stuff, and vehicle families can help identify:

- shared hierarchy naming;
- common attachment conventions;
- repeatable rig topology;
- shared UV/texture strategy;
- where silhouette requires a variant.

The goal is consistency without erasing identity.

### M3 — Attachables are first-class modelling evidence

Actions & Stuff and Friendly Fishing make held/worn presentation particularly valuable for:

- attachment anchors;
- hand relationship;
- alternate presentation position;
- scale/orientation ownership;
- visual-state composition.

This reinforces `ATTACHMENT` responsibility in the cross-domain vocabulary.

### M4 — Mechanical hierarchy should follow actual motion

Truck assets strengthen the existing rule:

```text
moving mechanical part
→ independent ARTICULATION owner
→ pivot/axis from mechanism
```

Static visible panels do not automatically deserve separate bones.

### M5 — Rich animation libraries require semantic clip organization

Actions & Stuff, Advanced Movement, Friendly Fishing, TNT Arena, and Truck Simulator can be mined for:

- persistent poses;
- transitions;
- locomotion/action families;
- repeated variants;
- long choreography;
- state-visible presentation.

Clip count itself is never a quality target.

### M6 — Distribution structure is not authoring structure

Opaque filenames, packaged identifiers, or obfuscated naming must not influence LazyDesigner semantic naming rules.

Study actual bone/animation relationships, not packaging names.

## Priority Order for Deep Modelling Mining

1. **Actions & Stuff** — player/humanoid rigging, attachables, animation/controller composition.
2. **Advanced Truck Simulator** — vehicle/mechanical hierarchy, pivots, attachment/coupling.
3. **Friendly Fishing** — creature-family consistency, rods/held objects, small-creature animation.
4. **Advanced Movement** — rich animation planning on compact rigs.
5. **Better on Bedrock** — selected entity/prop examples.
6. **Bloom** — furniture/environment/static-prop modelling.
7. **TNT Arena** — selected visual assets only.
8. **Realism Visuals** — defer unless a direct modelling/render-material question appears.

## Current Decision

All eight archives remain available as source material, but **only their Blockbench/modelling-relevant slices are admitted into LazyDesigner reference intelligence**.

The corpus does not expand project scope beyond MCP Blockbench authoring.

No gameplay/map/add-on architecture rule may be promoted from these sources into LazyDesigner.

Next deep audits must answer a modelling question such as:

- how should this asset decompose into semantic owners?
- where should pivots/locators sit?
- which details belong to geometry vs texture?
- how should a repeated asset family share rig conventions?
- how should animation clips/controllers be organized for an authored asset?
- how should attachment/held/worn presentation be structured?
