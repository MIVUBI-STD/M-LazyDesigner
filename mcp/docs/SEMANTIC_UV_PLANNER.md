# Semantic UV Planner

Status: SOURCE FOUNDATION
Updated: 2026-09-21
Branch: Local

## Goal

Replace coordinate-oriented UV island manipulation with deterministic semantic planning:

```text
surface/world extent
+ material cohort
+ texel density
+ symmetry share/unique policy
+ locked authored regions
+ previous placement state
+ affected IDs
→ bounded atlas plan
→ semantic diff
→ future native affected-only UV transaction
```

## Implemented source foundation

- deterministic MaxRects packing;
- reserved/locked rectangle support;
- default, per-cohort and per-island texel density;
- explicit shared UV ownership for symmetry/reuse;
- affected-only replanning that reserves unchanged previous placements;
- deterministic semantic diff with upserts/removals/unchanged identities.

## Important limits

This layer does not yet mutate Blockbench faces. It also does not infer Cube face islands automatically from geometry. Native UV extraction/application must remain owned by the existing UV/Texturing surface and must prove Undo, pixel-grid correctness, Box-UV/native rotation semantics and save/reopen behavior before public registration.

Shared UV is explicit. The planner never guesses reuse from equal dimensions alone.

Locked regions are treated as authored authority and cannot be displaced by incremental packing.

## Next integration

1. derive semantic island candidates from existing face/Box-UV state and Authoring Recipe symmetry policy;
2. preserve exact pixel-grid mapping and cohort density contracts;
3. compile a native affected-only UV apply plan;
4. expose through the existing UV/Texturing owner rather than adding another public tool family;
5. benchmark changed-island count, payload, wall-clock and correction rounds against explicit UV editing.
