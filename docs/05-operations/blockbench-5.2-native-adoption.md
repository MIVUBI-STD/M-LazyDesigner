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

## Deliberately Deferred

- `RenderTargetSnapshot` remains an internal Blockbench module rather than a proven stable plugin boundary.
- Screen-Space Brush, Layer Groups, and 3D Plane References remain native Blockbench features until a stable plugin-facing contract is demonstrated.
- Native particle/sound discovery is reused rather than duplicated with another scanner.
- `BBAnimation`/`BBKeyframe` alias migration and a `blockbench-types` baseline bump remain separate dependency/toolchain work.

## Live Residue

LIVE_BLOCKBENCH must still prove native target/source/pole mutation, pole clearing, target-rotation locking, preview behavior, Undo/Redo, and save/reopen persistence. Remote CI cannot claim those results.
