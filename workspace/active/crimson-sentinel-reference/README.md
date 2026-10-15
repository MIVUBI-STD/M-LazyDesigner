# Crimson Sentinel — saved asset

Current authority: `crimson_sentinel.bbmodel`, saved from the active native Blockbench project on 2026-10-15 (Asia/Jakarta). User approved the red model and animations. A blue texture variant is now included in the same project and is ready for review.

## Deliverables

- `crimson_sentinel.bbmodel`: NATIVE_SAVED; write verified and parsed. Bedrock project, 179 visible cubes, 16 groups, two embedded 512×512 textures (red base and explicit blue variant).
- `crimson_sentinel_512.png`: approved red texture export.
- `crimson_sentinel_blue_512.png`: blue texture export; both colors are embedded in the same model and use the same UVs.
- `shatter-collapse-forward-preview.gif`: current collapse review preview, assembled from 35 native side-view pose samples. `shatter-collapse-preview.gif` contains the same current preview.

## Embedded animations

- `animation.crimson_sentinel.magic_staff_slam`: 4.4 seconds, once; staff slam and attached cape motion.
- `animation.crimson_sentinel.shatter_collapse`: 8 seconds, hold ending; articulated forward fall, impact at 1.8 s, fracture after impact, attached cape, settled by 2.8 s, unchanged ground hold until 4.8 s, then gradual sinking. Only the stationary pedestal remains at the end.

Geometry, UV/texture and prior staff-slam animation were preserved during the collapse correction. Current animation result: USER_APPROVED. Native representative poses were reviewed; continuous visual playback and Minecraft runtime integration remain UNVERIFIED. No separate animation/gameplay export was requested in this save.

## Deferred work

Particle visibility investigation is deferred at the user request. It is not claimed fixed or visually verified. Resume only when requested, from `vfx/particle-preview-unresolved-report.json`.

## Evidence and recovery

- `shatter-collapse-verification.json`: current timing, cloth attachment, preservation and approval evidence.
- `forward-collapse-revision-recipe.json`: current revision recipe and corrections.
- `before-forward-collapse-revision.bbmodel`: backup before the forward-collapse correction.
- `before-shatter-collapse.bbmodel`: saved model before collapse animation authoring.

Earlier recipe/preview/checkpoint files in this directory are historical working artifacts; this README and the authoritative model above define current state.

## Two-color texture selection

Select Crimson Sentinel Atlas (red) or Blue — Crimson Sentinel in Blockbench Textures to switch the preview. Both are embedded in crimson_sentinel.bbmodel; there is one geometry/UV layout and the same two animations. Red is the default selected texture. Blue is an explicit variant in a non-material group, with native alignment ready and zero mismatches. Blue preserves gold/steel and changes crimson cloth/crystal/eye accents. See blue-texture-variant-verification.json. The temporary standalone blue project was removed after verified consolidation.
