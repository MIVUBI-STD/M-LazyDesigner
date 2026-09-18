# User Corpus — Cross-Modelling Synthesis

Status: `PATTERN` / `CANDIDATE_RULE` synthesis on branch `Ref` only.

## Scope

This synthesis uses only Blockbench/modelling evidence from:

- Actions & Stuff;
- Advanced Truck Simulator;
- Friendly Fishing;
- Advanced Movement.

No gameplay, Script API, function, scoreboard, worldgen, mission, or map-system knowledge is included.

## Strong Cross-Source Convergences

### C1 — Stable rig should outlive clip growth

Evidence:

- Actions & Stuff: broad player action library reuses semantic humanoid owners.
- Advanced Movement: about 200 player clips reuse a compact semantic body set.
- Friendly Fishing: several fish actions reuse the same body/tail/fin chain.

Pattern:

```text
new animation
→ reuse existing semantic owners first
→ add owner only when motion exposes a missing transform/deformation responsibility
```

Status: `PATTERN`.

This is stronger than the earlier candidate formulation and should guide future native validation.

### C2 — Presentation context does not imply a new base rig

Evidence:

- Actions & Stuff separates first-person, third-person, paperdoll, hand-slot, and worn presentation.
- Friendly Fishing rod uses distinct first/third-person presentation transforms and clips.

Pattern:

```text
same semantic asset
+
different presentation context
→ transform / clip / geometry-variant selection
not automatically
→ unrelated base hierarchy
```

Status: `PATTERN`.

### C3 — Attachments/locators are explicit authoring responsibility

Evidence:

- Actions & Stuff attachables and held/worn items.
- Friendly Fishing rod/bobber/line presentation.
- Truck Simulator non-visible offload locator and modular vehicle relationships.

Pattern:

```text
needs transform identity
but not visible volume
→ ATTACHMENT / Locator intent
```

Status: `PATTERN`, strongly reinforced.

### C4 — Shared parent + repeated articulated children

Evidence:

- Truck wheel groups with individual wheel owners.
- Fish body chain with repeated articulated distal segments.
- Rod line segmented structure.

Pattern:

```text
shared assembly placement
→ parent semantic owner

independent repeated transform
→ child articulation owners
```

Status: `PATTERN`.

### C5 — Distal/secondary motion can differ from proximal motion

Evidence:

- Friendly Fishing body → tail → tail-fin oscillation with phase/amplitude changes.
- Mowzie prior evidence for neck/feather/secondary chains.

Pattern:

```text
continuous/flexible chain
→ preserve ordered articulation
→ allow phase/amplitude differences along the chain
```

Status: `PATTERN`.

Do not turn this into a fixed amplitude curve.

### C6 — Rich motion does not justify dense geometry

Evidence:

- Advanced Movement: five primary prop geometries, large animation surface.
- Friendly Fishing: compact fish rigs supporting multiple actions.
- Actions & Stuff: action breadth comes from clip/controller composition, not per-action geometry.

Pattern:

> modelling complexity and animation complexity are independent budgets.

Status: `PATTERN`.

### C7 — Visual variants should isolate the smallest changed branch

Evidence:

- Truck upgrade branches for bumper/exhaust/lamps/mirrors/spikes/livery.
- Actions & Stuff attachables map multiple geometry variants under one semantic item.
- Mowzie prior evidence for state-visible hand variants.

Candidate:

```text
materially changed local form
→ isolate local variant branch

unchanged base form
→ reuse base ownership
```

Status: `CANDIDATE_RULE`.

This requires native tests before canonical promotion.

## Reinforcement of Responsibility Vocabulary

The new corpus fits the existing six-reason vocabulary without adding another category:

| Evidence | Responsibility |
| --- | --- |
| static body / shared rigid assembly | FORM |
| wheels, doors, tail chain, jaw, rod segments | ARTICULATION |
| held/worn slots, offload locator, item/bobber relation | ATTACHMENT |
| open/closed mouth, loaded/unloaded visual form, visual variants | STATE |
| fish tail propagation, flexible line/secondary structures | FOLLOW |
| animation/controller helper with named consumer | CONTROL |

Conclusion:

> No seventh responsibility category is currently justified.

## Modelling Decision Compression

For future MCP reasoning, the current corpus can be compressed into:

```text
1. Preserve correct form with the minimum necessary geometry.
2. Separate owner creation from Cube creation.
3. Add owner only for FORM / ARTICULATION / ATTACHMENT / STATE / FOLLOW / CONTROL responsibility.
4. Reuse stable semantic owners across clip growth and view contexts.
5. Use Locator/ATTACHMENT when transform identity needs no visible volume.
6. For flexible chains, preserve ordered articulation and allow phase/amplitude variation when motion requires it.
7. For local visual variants, isolate only the smallest materially changed branch.
8. Do not infer authoring semantics from obfuscated packaged identifiers.
```

This is a reasoning summary, not a schema.

## Correction Intelligence Additions

### Wrong motion path

Inspect:

```text
ARTICULATION
→ pivot
→ parent
→ chain distribution
```

before adding keyframes or geometry.

### Held/worn object wrong

Inspect:

```text
ATTACHMENT
→ owner
→ presentation context
→ orientation / scale / position
```

before changing base model proportions.

### Flexible motion looks rigid

Inspect:

```text
FOLLOW
→ ordered chain
→ phase
→ amplitude
→ terminal response
```

before adding unrelated bones.

### Variant causes duplicated asset

Inspect:

```text
STATE
→ what actually changes?
→ isolate smallest changed branch
```

before duplicating whole base geometry.

## Promotion Boundary

These findings are stronger cross-corpus patterns but remain non-canonical until LazyDesigner-owned native validation demonstrates:

- equal or better reference fidelity;
- fewer unnecessary owners;
- improved correction clarity;
- no context inflation;
- no regression in animation editability;
- lower or equal Cost to Accepted Result.

## Current Verdict

The uploaded corpus materially enriches modelling knowledge without requiring any project-scope expansion.

The strongest new modelling intelligence is:

> a stable semantic rig should support many clips, view contexts, and presentation states; hierarchy should grow only when a genuinely new authoring responsibility appears.
