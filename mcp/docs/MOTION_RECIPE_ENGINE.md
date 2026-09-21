# Motion Recipe Engine

Status: SOURCE FOUNDATION
Updated: 2026-09-21
Branch: Local

## Goal

Replace frame-by-frame animation authoring with:

```text
motion/sequence intent
→ semantic poses + timing
→ deterministic motion compile
→ optional curve sampling / mirroring
→ affected-bone diff
→ existing create_animation or manage_keyframes contracts
```

## Source foundation

- semantic pose recipe;
- sequence/step timing with optional holds;
- deterministic duration/loop handling;
- curve sampling helpers;
- explicit bone mirroring;
- affected-bone diff;
- compilation to existing `create_animation` for new clips;
- compilation to existing `manage_keyframes` requests for bounded corrections;
- no new public capability.

## Limits

The engine does not infer motion meaning from asset names. It does not claim physically correct gait/contact, reference fidelity, root motion, or accepted animation quality.

Native keyframe creation, Bezier behavior, playback, Undo/Redo and save/reopen remain LIVE_BLOCKBENCH proof.

## Next source work

Only evidence-driven additions are allowed: pose constraints/contact preservation, phase relationships for cyclic motion, and recipe-to-controller linkage where a concrete workload demonstrates reduced mechanical authoring. Avoid adding a generic animation graph language.
