# Blockbench 5.2 Native Adoption

Branch: `Local`

This note owns the source-side Blockbench 5.2 adoption boundary. Native/live acceptance remains separate.

## Implemented

- `bone_rigging(action=set_ik_controller)` uses Blockbench 5.2 native Null Object IK-controller fields for target, root/source, pole, and target-rotation lock.
- Legacy `set_ik` remains available and does not receive native-controller fields implicitly.
- References resolve UUID first, then unique exact name; ambiguous or incompatible targets fail before Undo.
- Runtime feature detection requires native `NullObject.ik_source` and `NullObject.ik_pole`.
- Native IK controller payload does not require the unrelated `bone_data.name` field.
- `inspect_element` and Null Object state reporting include `ik_pole`.
- Capability discovery aliases include IK controller/root/source/pole terminology.
- Complete native IK mutation receipts can continue without a redundant focused reread.
- No Gateway/public capability was added.

## Source reconciliation — 5.2.1 baseline

The Blockbench HD `chatgpt-dev` native-capability registry documents the 5.2.1 source revision `e2ede0809ee6bc91f374ac7e00d34cffbdf86a14`. These are *source observations*, not LazyDesigner native acceptance or authority to remove fallbacks.

| Candidate | Existing LazyDesigner owner | Decision |
| --- | --- | --- |
| 3D reference planes/video | Reference Package + native capture/visual review | Keep approved image/reference revision authoritative. Native 3D plane/timecode persistence and timeline synchronization remain unverified; do not create another reference state store or mutation tool. |
| RenderTarget face/UV mapping | `mcp/server/tools/inspection/camera.ts` + Geometry/UV evidence | Blockbench `RenderTargetSnapshot` remains an internal viewport implementation, not a proven stable plugin API. Reuse current deterministic capture and UV evidence; do not replace it with undocumented internal calls. |
| Texture Layer Groups | `mcp/server/tools/paint/layerState.ts` and `selectionLayers.ts` | Native 5.2 stores group items and pixel layers in one array, while the existing tool performs flat index edits. Structural actions and index-changing metadata now fail before Undo on grouped or unknown layer hierarchies. Safe pixel-layer metadata changes remain available. |

Layer Groups are not adopted as a new public authoring capability. The fallback remains deterministic flat-layer operations. Native group authoring requires demonstrated hierarchy persistence, visibility/composite parity, reorder/reparent Undo/Redo, and atlas export parity on an exact installed build before changing this boundary.

## Deliberately Deferred

- No `RenderTargetSnapshot` import or second reference/QA pipeline without a stable plugin API and relevant native evidence.
- Screen-Space Brush, 3D Plane References, and group editing remain native Blockbench features until their plugin-facing contracts and review proof are established.
- Native particle/sound discovery is reused rather than duplicated with another scanner.
- `BBAnimation`/`BBKeyframe` alias migration and a `blockbench-types` baseline bump remain separate dependency/toolchain work.

## Live Residue

LIVE_BLOCKBENCH must still prove native target/source/pole mutation, pole clearing, target-rotation locking, preview behavior, Undo/Redo, and save/reopen persistence. Remote CI cannot claim those results.
