# Procedural Texture / Material Recipe Engine

Status: SOURCE FOUNDATION
Updated: 2026-09-21
Branch: Local

## Goal

Replace stroke-oriented texture authoring with deterministic material intent:

```text
material intent
→ base/gradient/seeded variation
→ masks
→ edge/cavity/wear treatment
→ palette/dither
→ affected-region diff
→ existing texture/paint/material ownership
```

## Implemented source foundation

- semantic material recipe presets;
- deterministic gradient/noise/palette/dither compilation;
- edge and alpha-cavity masks;
- composable mask operations;
- masked color and directional wear operations;
- smallest changed-region detection;
- semantic PBR intent → existing Bedrock MER/color/subsurface values;
- static efficiency benchmark;
- no new public capability.

## Boundaries

This layer is buffer-first computation only. It does not create a visual node editor, background renderer, second material database, or second Painter.

Native texture mutation must continue through existing paint/texture transaction owners. PBR creation/configuration continues through `create_pbr_material` and `configure_material`.

REMOTE_GITHUB does not prove native canvas color-space behavior, layer persistence, Undo/Redo, save/reopen, seam quality, or accepted visual fidelity.

## Next source work

Only add deterministic surface patterns or texture-set channel generation when a concrete workload demonstrates value. Native wiring should use affected-region writes and existing transaction receipts rather than whole-atlas rewrites.
