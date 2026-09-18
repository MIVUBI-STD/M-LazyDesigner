# Lift

Asset / Goal: Reference-grounded Minecraft Bedrock lift; DIRECT authoring fixture and delivered asset.

Approved Reference: `references/approved-reference.png`; `references/window-detail.png`.

Requested Dimensions: width=5 height=5 length=6 blocks; X=80 Y=80 Z=96 Blockbench units; ground Y=0.

Geometry Strategy: DIRECT

Animation Required: YES

front_direction: +z

Current Stage: COMPLETE

Geometry: APPROVED

UV Layout: PASS

Texturing: APPROVED

Animation: APPROVED

Current model file: `lift.bbmodel`

Deliverables: `lift.bbmodel`, `lift.geo.json`, `lift.png`, `lift.animation.json`.

Material handoff constraints: approved base-color pixel-art workflow, no PBR; current approved atlas is 1024×1024 at 16x density. Geometry/UV/texture/animation remain accepted unless a fresh user request reopens the corresponding owner.

Animation delivery:
- `animation.lift.door_open`: 1.2 s, once, closed → open.
- `animation.lift.door_close`: 1.2 s, hold final pose, open → closed.
- `door_left` / `door_right` authored X travel: -18 / +18 units.

Current next step: None for the requested asset authoring.

Known blocker(s): None for the delivered asset. Native close/reopen persistence and strict reference-equality claims are not established by this README; current system proof belongs in `../../../docs/05-operations/current-validation.md`.

Fixture boundary: LIFT is historical structural/compatibility fixture media only. It is **not** a craftsmanship, visual-quality, acceptance-quality, or efficiency benchmark. Preserve canonical `lift.bbmodel`; any structural compatibility test must use a disposable copy when mutation is required. LIFT-specific behavior must not become MCP Runtime/tool/policy semantics.
