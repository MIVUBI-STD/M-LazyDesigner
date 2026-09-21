# Authoring Automation Hardening Audit

Updated: 2026-09-21
Branch: Local

## Scope

Hard audit of the new remote-only authoring foundations:

```text
Parametric Geometry
Semantic UV
Semantic Rig/Pivot
Motion Recipe
Procedural Texture/Material
Cross-domain impact planning
```

The goal of this pass was removal of false precision, speculative helpers, contract mismatch, benchmark theater, and unsafe assumptions before LOCAL_CODE/LIVE_BLOCKBENCH proof.

## Material findings fixed

### Semantic UV
- Fixed recipe-instance vs native-Cube UUID identity mismatch by adding an ownership-aware target bridge.
- Native UV apply now carries expected recipe/instance ownership and fails if ownership changed after planning.
- Native transaction fingerprints are scoped to affected Cubes instead of unrelated snapshots.
- Incomplete semantic→native target mapping now fails closed.
- Incremental retained placements now preserve their padded footprint.
- Shared UV aliases must resolve to identical pixel extents.
- Duplicate previous placement identities are rejected.
- Footprint utilization now distinguishes padded occupancy from raw content utilization.
- Box UV remains fail-closed; no implicit conversion.

### Semantic Rig
- Geometry-derived pivots now fail closed for rotated source geometry until transformed-anchor semantics exist.
- Existing parent identities are delegated to canonical add_group preflight rather than rejected by a duplicate local validator.
- Removed unused standalone rig diff helper.
- Mirror/IK remain explicit-policy operations; no guessed handedness.

### Motion Recipe
- Mirrored Euler rotation requires explicit sign policy; no axis-only guess.
- Contact constraints now insert exact boundary keyframes, so a hold is structurally represented rather than implied.
- create_animation no longer silently drops interpolation metadata; interpolation is routed through bounded post-create manage_keyframes edits.
- Removed unused standalone curve-sampling helper with no execution consumer.
- Keyframe correction continues to rely on existing native replace semantics rather than a second executor.

### Texture / Material
- Painted metal global metalness default corrected to dielectric; exposed metal must be authored explicitly.
- Removed unused cavity/composable-mask helpers and wired retained edge masks into actual source composition.
- Surface panel parameters reject line widths larger than spacing.
- Refinement compiler now matches the existing compute envelope exactly.
- Ordered palette dithering is rejected inside bounded ROI because the runtime requires atlas-relative Bayer phase.
- Replaced arbitrary brush-stroke benchmark proxy with an explicit-pixel authored-numeric-value proxy.
- Added adapter from procedural RGBA source to the existing create_texture data-URL contract using the existing PNG encoder.

### Cross-domain planning
- Removed false affected-only precision when Rig/Animation ownership is unknown.
- Affected-only Rig/Animation scopes are emitted only with explicit downstream instance ownership.
- Unknown ownership falls back to semantic replan/review.
- Removal-only changes invalidate downstream UV/Texture semantics without inventing deleted face IDs.
- Orchestration benchmark now checks bounded ownership behavior rather than arbitrary JSON-size comparison.
- Planner remains pure/stateless and does not create a dependency database or second Control.

## Deliberately not claimed

REMOTE_GITHUB does not prove:

```text
Bun/typecheck/CI PASS on current SHA
native Undo/Redo fidelity
save/reopen persistence
Blockbench UV face-rotation behavior
Box-UV conversion appearance
native IK behavior
keyframe/Bezier playback correctness
PNG/canvas color-space behavior
wall-clock or memory improvement
actual provider token savings
visual/reference acceptance
correction-round reduction
```

These remain LOCAL_CODE/LIVE_BLOCKBENCH evidence.

## Stop condition

Remote source is now at a stronger stop point. Further authoring abstraction should be added only after local/live evidence demonstrates a concrete gap. Do not add another planner, graph, daemon, database, public tool family, or visual node system as speculative cleanup.
