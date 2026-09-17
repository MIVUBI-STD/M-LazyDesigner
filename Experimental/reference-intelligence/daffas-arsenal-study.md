# Daffa's Arsenal — Reference Intelligence Study

Status: `OBSERVATION` / `PATTERN` extraction only. Not production authority.

Source inspected: user-provided `daffas_arsenal-3.7.1.1.jar`.

## Rights Boundary

The JAR contains conflicting license metadata: `META-INF/mods.toml` declares `CC-BY-NC-4.0`, while `addon/daffas/assets/daffas_arsenal/gunpack_info.json` declares `All rights reserved`. Until rights are independently resolved, treat the corpus as analysis-only. Do not copy its model, texture, animation, sound, Lua, or other asset payloads into LazyDesigner.

## Corpus Scale

Observed corpus inventory:

- 83 geometry JSON files
- 69 animation JSON files
- 265 texture PNG files
- 77 display definitions
- large supporting sound/state-machine content

The value of this corpus is structural variety: simple-to-complex hard-surface geometry, dense articulated hierarchies, helper/anchor bones, state-aware animation, repeated-action variants, and material-map examples.

## Representative Study Set

| Asset | Cubes | Bones | Visible bones | Non-visual/helper bones | Max hierarchy depth | Animation clips | Unique animated bones |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| HK416 | 646 | 83 | 44 | 39 | 7 | 36 | 46 |
| Taurus | 284 | 79 | 37 | 42 | 8 | 24 | 49 |
| RPD | 676 | 161 | 83 | 78 | 16 | 41 | 79 |
| MG338 | 1084 | 174 | 92 | 82 | 17 | 30 | 82 |

A major repeated observation is that roughly half of the hierarchy in these complex authored assets can be non-visual. Geometry alone therefore does not explain authoring quality; transform ownership, helpers, anchors, mechanical state, and animation structure are first-class concerns.

## Study A — HK416

### Structural observations

HK416 separates visible assemblies, moving mechanical parts, held-object relationships, attachment locations, view helpers, and animation helpers rather than placing the full object under one undifferentiated root.

Observed semantic roles include concepts equivalent to:

- main receiver / rail / barrel / stock / grip;
- magazine and bullet grouping;
- magazine release, charging handle, piston, dust cover, sight;
- left/right hand relationships;
- muzzle, stock, grip, scope, laser positions;
- camera/view/refit helpers.

The densest visual group is not necessarily the most important animation owner. For example, a high-cube rail/receiver structure can remain mostly static while a low-cube mechanical child requires a carefully placed pivot.

### Animation observations

36 clips include families for repeated shooting, reload, inspection, equip/stow, aim, persistent/static state, fire-mode transition, and melee. The set uses `catmullrom` interpolation extensively.

The strongest generic lesson is clip responsibility separation:

```text
persistent visual state
transition into/out of state
repeated action variants
long interaction sequence
view/aim transition
```

These responsibilities are not forced into one timeline.

## Study B — Taurus

### Structural observations

Taurus has fewer cubes than HK416 but slightly fewer total bones, with more helper/non-visual bones than visible bones. This is evidence that authoring complexity can come from state/mechanical requirements rather than mesh density.

Its hierarchy isolates cylinder/ammunition relationships, loader elements, hand relationships, release/hammer mechanisms, attachment/view helpers, and projectile/ammunition groups.

### Animation observations

The strongest pattern is state-conditional action authoring. Examples include conceptually separate loaded/empty equip and inspect behavior and reload variants for different ammunition states.

Candidate abstraction:

```text
same user-visible action
+ materially different mechanical state
→ allow a distinct authored clip when motion actually differs
```

Do not multiply clips merely because state labels exist; state-specific clips are justified only when motion/pose evidence materially changes.

## Study C — RPD

### Structural observations

RPD increases hierarchy depth to 16 and contains almost as many helper/non-visual bones as visible bones. It includes dedicated chain/ammunition structures and a large number of authored transform groups.

The hierarchy demonstrates that repeated articulated structures can require a deep parent chain, but also exposes a negative pattern: many opaque or joke/generated bone names make the same structure harder for an AI authoring system to reason about.

### Animation observations

41 clips include approximately 20 shooting-family clips plus reload, inspect, equip/stow, persistent state, aim, and additional chain/ammunition-related sequences.

Long reload sequences touch many bones and contain substantially more keyed entries than short firing clips. This suggests animation planning should estimate motion scope before authoring rather than treating every clip as equivalent work.

## Study D — MG338

### Structural observations

MG338 is the largest representative sample studied here: 1084 cubes, 174 bones, hierarchy depth 17. It separates major receiver/barrel/cover structures from ammunition-chain mechanics, helper positions, view/control structures, and smaller mechanical assemblies.

The important lesson is not to target this complexity. It is to recognize when an object contains multiple independent transform responsibilities and to isolate them before animation.

### Animation observations

30 clips animate 82 unique bones. Long reload sequences dominate keyframe density, while repeated shooting variants are shorter and structurally similar.

This supports a distinction between:

- high-frequency short action variants;
- low-frequency long choreography;
- persistent pose/state clips;
- transition clips.

## Cross-Corpus Patterns

### PATTERN P1 — Decompose by transform responsibility

A component deserves independent transform ownership when it must move, rotate, hide/show, attach, detach, carry children, anchor another object, or preserve a distinct pivot relationship.

Do not create a separate bone merely because a visual region is detailed.

### PATTERN P2 — Separate visible geometry from functional hierarchy

Functional bones/helpers can legitimately have no visible cubes. Common roles include anchors, hand positions, camera/view controls, attachment positions, persistent-state groups, and animation controls.

### PATTERN P3 — Pivot intent follows mechanical intent

Pivot placement should derive from the real transform relationship: hinge, slide axis, rotation center, hand/attachment anchor, or parent-space requirement. Visual center is not a safe default for moving components.

### PATTERN P4 — Plan clip families before keyframes

Before authoring animation, classify requested behavior into the smallest meaningful clip inventory:

- persistent state;
- transition;
- repeated action;
- interaction/choreography;
- optional state-conditioned variant.

Then author keyframes.

### PATTERN P5 — Repeated action may benefit from authored variation

Multiple variants can reduce mechanical repetition when an action occurs frequently. Variation is optional and must preserve the action's functional/readability constraints.

### PATTERN P6 — State-conditioned clips require real motion differences

Loaded/empty, open/closed, equipped/unequipped, or similar states justify separate clips only where the authored motion or persistent pose materially differs.

### PATTERN P7 — Complexity must be causal

High cube/bone/keyframe counts are observations, never goals. Add complexity only when it improves silhouette, reference fidelity, transformability, motion quality, or required state representation.

### PATTERN P8 — Semantic naming is part of AI authorability

Opaque/generated/joke names are a negative pattern for LazyDesigner. Prefer stable role names such as `door_left`, `hinge`, `magazine`, `left_hand_anchor`, `scope_anchor`, or equivalent domain names. Names should help later inspection and correction locate the causal owner.

### PATTERN P9 — Animation scope predicts authoring cost

Long interaction/reload-style choreography tends to touch more bones and contain substantially more keyed states than short repetitive actions. Planning should account for affected-bone breadth, duration, and state transitions rather than only animation count.

### PATTERN P10 — Presentation/gameplay configuration is not geometry authority

Display/state-machine/runtime configuration can reveal intended states and interactions, but Java/TACZ runtime semantics must not become LazyDesigner Bedrock authoring rules. Extract only generic visual-authoring requirements.

## Candidate Rules for Cross-Domain Testing

These are `CANDIDATE_RULE`, not canonical policy yet.

1. Before geometry mutation, produce a compact component plan with `static`, `movable`, `anchor/helper`, and `unknown` roles when the reference contains multiple functional parts.
2. A movable part must have explicit transform intent before approval: movement type + pivot/axis + parent owner.
3. Do not create helper bones speculatively. Each helper must have a named downstream purpose.
4. Before complex animation authoring, generate a clip plan separating persistent states, transitions, repeated actions, and long interactions.
5. Consider variants only for high-frequency repeated motions where variation improves accepted visual quality.
6. When correction repeatedly targets the same visual region, inspect its component ownership/pivot/parenting before adding more cubes or keyframes.
7. Treat semantic hierarchy naming as part of maintainability and correction quality.
8. Complexity growth requires an explicit causal reason; cube/bone/keyframe count alone is never a success metric.

## Required Validation Before Promotion

Test candidate rules on unrelated Bedrock-targeted asset families using only references/assets that are current and considered sufficiently strong quality benchmarks, at minimum:

- a high-quality mechanical object with meaningful moving parts;
- a high-quality humanoid/NPC rig;
- a simple prop with little or no animation;
- an organic/non-mechanical object;
- one asset where over-rigging would clearly be harmful.

Do not use deprecated, old, merely functional, or known-subpar LazyDesigner fixtures as quality authority. Such assets may be inspected only as historical implementation evidence when explicitly useful, never as a benchmark for craftsmanship or visual quality.

For each test compare:

```text
accepted visual/reference quality
number of correction cycles
unnecessary bone/cube growth
tool/context cost
ability to identify causal owners during correction
animation readability and editability
```

A candidate should be rejected or narrowed if it improves one corpus-like hard-surface asset but harms simpler or unrelated authoring tasks.

## Current Decision

The corpus is accepted as a strong craftsmanship-learning source, especially for decomposition, rig responsibility, pivot intent, clip planning, state-conditioned motion, and complexity discipline. No Java/TACZ implementation semantics or source asset payloads are approved for promotion.
