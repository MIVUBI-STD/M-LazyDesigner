# Advanced Movement — Compact Rig / Rich Animation Study

Status: `OBSERVATION` / `PATTERN` extraction only. Analysis-only external corpus.

## Scope

Only geometry, rig ownership, animation clip planning, and visual motion are considered.

Movement gameplay implementation and scripts are ignored.

## Geometry Surface

Observed models:

| Asset | Bones | Cubes | Max hierarchy depth |
| --- | ---: | ---: | ---: |
| Cannon | 4 | 11 | 2 |
| Platform | 1 | 6 | 0 |
| Rocket | 4 | 8 | 2 |
| Spring | 4 | 3 | 2 |
| Tutorial humanoid/presentation model | 26 | 45 | 6 |

This is intentionally small compared with the animation surface.

## Animation Surface

Observed:

- 12 non-player/prop/tutorial clips in one animation file;
- about 200 player clips in another animation file;
- common player clips touch approximately 5–8 semantic body owners;
- action families include walk, jump variants, double jump, flip, climb, spring response, rocket riding, and tutorial presentation;
- a very large `ride_rocket.N` family reuses roughly the same five semantic owners.

## Core Finding

```text
small/stable rig
+
large clip inventory
```

is entirely viable.

Therefore:

> animation count is not a reason to increase geometry or hierarchy count.

## Stable Owner Reuse

Representative motion clips reuse the same broad player anatomy rather than adding action-specific bones.

Generic lesson:

```text
new action
→ first reuse existing semantic owners
→ add owner only if transform/deformation responsibility is genuinely missing
```

This strongly supports the Minimum Sufficient Structure rule.

## Clip Scope

Different action classes affect different subsets of the same rig.

Examples:

- walk: leg/arm/body owners;
- climb: smaller targeted set;
- jump/flip: broader body set;
- rocket riding: repeated state/pose family over the same owners.

### Modelling implication

Rig design should maximize useful transform ownership, not clip-specific specialization.

## Repeated Clip Families

The large rocket-riding sequence demonstrates that many clips can be state/pose variants over one stable owner set.

Safe conclusion:

> large clip families may represent authored state progression, but do not imply a need for additional bones.

Do not adopt the specific 0..N variant count as a generic rule.

## Prop Animation

Small props such as spring, cannon, rocket, and platform use very compact geometry/hierarchy while still supporting clear animated behavior.

This reinforces:

```text
simple prop
+ one meaningful articulation owner
can be enough
```

without speculative helper structure.

## Candidate Rules

### M1 — Clip growth should not drive rig growth

Status: `PATTERN`.

A new clip should reuse existing semantic owners unless the action exposes a missing transform/deformation responsibility.

### M2 — Rig quality is coverage, not node count

Status: `CANDIDATE_RULE`.

A rig is sufficient when its owners can express required actions cleanly with meaningful pivots/relationships. More nodes are not automatically more capable.

### M3 — Compact props can still animate richly

Status: `PATTERN`.

Prop animation should add only the minimum articulated owners required by the motion.

## Case-Level Audit — Player Clip Owner Reuse

`player.json` contains about 200 clips.

Representative owner scopes:

- walk: `root`, `head`, both arms, both legs;
- climb: head + both arms + both legs;
- jump: head, body, both arms, both legs;
- double jump / flip: body, both arms, root, both legs, head;
- spring: head, both arms, both legs, root.

These materially different actions reuse the same small semantic anatomy set.

### Strong modelling conclusion

```text
action diversity
→ clip diversity
not automatically
→ hierarchy diversity
```

The rig should expose useful transform capability once, then clips reuse it.

## Case-Level Audit — Rocket Ride Family

A very large `ride_rocket.N` clip family repeatedly targets the same five semantic owners:

```text
root
rightArm
leftArm
leftLeg
rightLeg
```

Each clip is roughly a one-second looping pose/motion state over the same owner set.

There is also an `.old` family using the same owner scope.

### Safe conclusion

Large pose/state libraries can be represented as many authored clips over one stable rig.

Do not infer that the specific number of variants is a desirable pattern; only the owner reuse is relevant.

## Case-Level Audit — Small Animated Props

`mvt.json` contains compact prop animation:

- spring default / active;
- cannon default / shoot;
- rocket default;
- other small presentation clips.

Representative targeted owners:

```text
spring active → spring, spring_head
cannon shoot → body
rocket default → root, body
```

This reinforces Minimum Sufficient Structure:

> if one or two owners express the complete required prop motion, adding helper hierarchy is not justified.

## Case-Level Audit — Small Controller Surface

The animation-controller file contains only two controllers:

- tutorial: `default`, `recipe1`, `recipe2`;
- rocket: `default`, `flying`.

This is a useful contrast with the roughly 200 player clips.

### Strong conclusion

```text
large clip library
does not imply
large controller graph
```

Clip inventory, rig complexity, and controller complexity are independent authoring dimensions.

## Refined Modelling Principle — Three Independent Budgets

Status: `PATTERN`.

Treat these separately:

```text
GEOMETRY / RIG BUDGET
→ required form + transform capability

CLIP BUDGET
→ required authored motions / poses

CONTROLLER BUDGET
→ required temporal/state composition
```

Growth in one budget is not sufficient reason to grow either of the others.

This is directly useful for avoiding overdevelopment in AI-authored Blockbench assets.

## Current Verdict

Advanced Movement is valuable specifically because it counters the assumption that rich animation requires dense geometry or dense hierarchy.

No Script API/gameplay behavior is admitted into LazyDesigner knowledge.
