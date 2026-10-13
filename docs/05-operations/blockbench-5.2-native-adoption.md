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

## Source reconciliation — 5.2.2 patch (2026-10-08)

Upstream authority: [Blockbench v5.2.2 release](https://github.com/JannisX11/blockbench/releases/tag/v5.2.2), source tag `c9ace42ef1b770bdadfe656729c7833b8feb37d2`, and [v5.2.1...v5.2.2 diff](https://github.com/JannisX11/blockbench/compare/v5.2.1...v5.2.2). The GitHub comparison reports 39 commits / 48 changed files. These are **upstream source observations**, not a LazyDesigner native PASS.

| Upstream change | Impact on existing LazyDesigner owner | Decision / minimal proof |
| --- | --- | --- |
| `js/animations/animation.js` fixes baked IK keyframe Undo capture and pre-rotated-bone baking | `bone_rigging(set_ik_controller)`, Animation Undo, native acceptance | Keep current controller/rigging owner. No claim that LazyDesigner exercises Blockbench's Bake IK action. Test set/clear pole, pre-rotated bone preview and existing Undo/Redo/save/reopen; investigate native Bake IK separately only if a current workflow uses it. |
| `js/animations/keyframe.js` selection now iterates animator channels, including effects | `manage_animation_timeline`, `manage_animation_effects` | Existing direct UUID/data-point mutation does not depend on the editor's pre/after/column selection action. Preserve explicit identity. Test selected-effect UI behavior only if an actual MCP route uses the native selection action. |
| `js/animations/animation_mode.js` changes particle watcher reload timing and ignores empty read | Animation particle effect inspection and resource reload | Existing effect/resource contracts remain. During an applicable live particle reload case, verify correct contents, no stale evidence, and no duplicate effect; do not create a second file watcher. |
| `js/texturing/painter.js` changes Color blend to preserve base HSL lightness | Native Painter branch vs deterministic texture compute | Do not equate the native Color blend algorithm with a deterministic color operation without evidence. Only run a small before/after pixel comparison when the Color blend branch is actually requested. |
| `js/uv/uv_size.ts` changes the UV-size dialog's default adjustment | `uv/semanticRuntime.ts`, native UV authoring | No public schema change: the existing native UV transaction supplies explicit mapping and rejects stale source fingerprints. UI-dialog-only default does not justify a new MCP capability. |
| `js/modeling/transform.js` adjusts Center Individual Pivots by scene position | Geometry pivot / reference-scene evidence | Check world/local origin only if a live pivot case has a non-zero preview-scene offset. Do not infer a Bedrock regression from the Java-format fix alone. |
| Java block/item texture object references and `force_translucent`; FBX/glTF fixes | Current Bedrock Entity product scope | Not a reason to expand model-format support or bump tool schemas. Revisit only for an explicitly supported output path. |

### Exact-version acceptance boundary

The canonical `mcp/compatibility/blockbench.json` already permits Blockbench **5.2.2** as `compatible-unverified` (minimum `5.1.0`, next review boundary `5.3.0`). Its empty `liveValidatedBuilds` is correct; do **not** add 5.2.2 or change the type baseline based on a release note, source diff, synthetic test, or historical live run.

The existing `docs/05-operations/local-acceptance-runbook.md` and the native verifiers remain the only execution route. Use the normal exact-SHA source gate, then the existing disposable Animation/Texture/Particle/persistence sequence. For 5.2.2, add **only applicable** review observations above; do not require optional UI actions, glTF, or unrelated formats on every Bedrock fixture. Record editor version, plugin bundle identity, project UUID and the first concrete divergence. If a real incompatibility appears, patch the first affected native owner and add its narrow regression test, instead of introducing a parallel versioned Runtime or another MCP public tool.

**Proof:** upstream release and diff inspected; no current exact-head Bun verification, installed Blockbench 5.2.2 execution, native Undo, replay, save/reopen or visual acceptance was performed by this source reconciliation.

## Deliberately Deferred

- No `RenderTargetSnapshot` import or second reference/QA pipeline without a stable plugin API and relevant native evidence.
- Screen-Space Brush, 3D Plane References, and group editing remain native Blockbench features until their plugin-facing contracts and review proof are established.
- Native particle/sound discovery is reused rather than duplicated with another scanner.
- `BBAnimation`/`BBKeyframe` alias migration and a `blockbench-types` baseline bump remain separate dependency/toolchain work.

## Live Residue

LIVE_BLOCKBENCH must still prove native target/source/pole mutation, pole clearing, target-rotation locking, preview behavior, Undo/Redo, and save/reopen persistence. Remote CI cannot claim those results.
