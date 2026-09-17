# LazyDesigner Native Acceptance

Updated: 2026-09-18  
Scope: `LOCAL_CODE` + `LIVE_BLOCKBENCH` proof contract only.

This is **not** a second production workflow. It is a bounded acceptance contract used after a fresh installation or a material Gateway/Runtime/plugin/authoring-intelligence change.

## Goal

Prove that the exact checked-out `Local` source works through the real execution chain:

```text
Codex / AI client
→ persistent LazyDesigner Gateway
→ Runtime
→ Blockbench plugin
→ native Blockbench project
→ save/export/reopen
```

Static source, simulated tests, CI, successful tool calls, numeric validators, screenshots, and export success alone do not prove the complete chain or visual acceptance.

## Acceptance Asset

Use one disposable but reference-driven Bedrock Entity prop with:

- several adjoining Cubes;
- at least one intentional positive-volume intersection or layered contact;
- one UV/texture atlas;
- one simple articulated part when Animation is being accepted;
- an approved reference image with enough views to judge silhouette/depth.

Do not use a production-critical asset for the acceptance run.

## 1. Exact-source and startup proof

Before native authoring:

```text
clean matching Local SHA
→ pinned dependencies installed
→ targeted tests/typecheck/build current
→ Gateway starts once
→ Runtime/Blockbench connects beneath the same Gateway
```

Required evidence:

- the checked-out SHA is recorded;
- Runtime/build identity corresponds to that source;
- Gateway exposes only `status`, `search_capabilities`, `describe_capability`, `invoke_capability`;
- no direct-Runtime connection is used as the normal client authoring path;
- project UUID/affinity is explicit and stable.

## 2. AUTHORING surface / focus proof

### Geometry → Texturing focus

Prove on the real transport:

```text
Geometry focus
→ apply Texturing focus
→ AUTHORING surface remains the same
→ capability set remains semantically identical
→ no new client task/chat
```

If the current Gateway still refreshes conservatively, record that behavior. Relax same-AUTHORING catalog invalidation only after matching transport tests prove it safe.

### AUTHORING → Animation → AUTHORING

Prove:

```text
AUTHORING
→ Animation surface applied
→ Animation catalog active
→ AUTHORING restored
→ AUTHORING catalog active
```

A Runtime/plugin reload must recover beneath the persistent Gateway. Replacing the Gateway process itself is the only expected client reconnect boundary.

## 3. Geometry evidence

After the final Geometry mutation and before review:

- `inspect_model_bounds` returns existing Geometry evidence plus `surface_integrity`;
- `COPLANAR_SURFACE_OVERLAP` is zero for supported/complete scan scope;
- positive-volume intersections are reviewed as structural evidence, not automatically treated as texture defects;
- if `surface_integrity.complete=false`, the unsupported rotated/group-transformed/mesh scope is reviewed natively rather than being treated as clean;
- degenerate geometry and duplicate-name/hierarchy evidence are resolved where material;
- reference comparison covers silhouette, depth, attachment, negative space and identity landmarks;
- technical evidence remains separate from visual/user approval.

## 4. UV / Texture evidence

Before Texturing completion:

- `list_textures(diagnostics=true)` returns `physical_uv_evidence`;
- invalid/degenerate physical-to-UV mappings are resolved;
- large non-uniform density/aspect evidence is reviewed against intentional mapping;
- exact shared UV regions with different physical dimensions are explicitly reviewed rather than silently accepted;
- Mesh UVs, when present, are reviewed separately if cube-face evidence reports incomplete scope;
- atlas organization remains editable and bounded to the approved logical resolution;
- mapped-model appearance, not atlas neatness alone, owns visual acceptance.

No automatic atlas compaction is required for acceptance. Compaction is only justified after the native export/reimport path proves orientation, shared-region and padding preservation for the affected project class.

## 5. Animation craft / contact proof

When Animation is required:

- `inspect_animation(diagnostics=true)` returns existing animation/root-motion evidence plus `motion_craft_evidence`;
- lockstep multi-bone timing and dense sampling are treated as review hints, never automatic failures;
- action intent establishes applicable anticipation/action-or-impact/follow-through/recovery phases without turning the phase scaffold into a mandatory keyframe checklist;
- contact/attachment invariants are inspected only for participating relationships;
- planted contact, grip/attachment, joint closure and clearance are checked through representative native playback;
- static start/middle/end captures do not prove smoothness or contact continuity;
- cyclic motion is observed for at least three consecutive cycles when applicable;
- a rig/pivot/contact geometry blocker returns to Geometry instead of being hidden with denser keys.

## 6. Review evidence freshness

At each user-review boundary:

- evidence belongs to the current project/revision;
- mutation invalidates only affected evidence classes;
- stale screenshots/review artifacts are not reused as current proof;
- internal `PASS` means `READY_FOR_USER_REVIEW`, never user approval;
- approval remains `USER_APPROVED` or explicitly authorized `AUTONOMOUS_VERIFIED` according to the canonical readiness contract.

## 7. Reload and interruption recovery

Prove each once on the current installed build:

```text
Runtime rebuild/reload
plugin reload
Blockbench close → reopen
```

Expected behavior:

- persistent Gateway survives temporary Runtime/plugin loss;
- Runtime reconnects demand-driven beneath it;
- project affinity is not silently rebound to another project;
- an interrupted mutation with uncertain outcome is inspected before retry;
- no mutation is automatically replayed after `OUTCOME_UNKNOWN`.

## 8. Native persistence / export / reopen

Save/export the acceptance asset, close/reopen as appropriate, then verify:

- expected Group/Cube hierarchy remains;
- pivots/locators remain where applicable;
- texture is attached and UV mapping preserved;
- dimensions and major silhouette remain unchanged;
- authored animation/controller state persists when included;
- Undo/playback remains functional before export;
- reopened visual result is coherent against the approved reference.

Minecraft in-game behavior is outside this acceptance unless separately tested.

## 9. Cost to Accepted Result

Record only actionable measurements:

```text
discovery calls
schema-description calls
focused reads
mutations
review captures
phase/focus changes
recovery events
correction rounds
```

Optimization target is fewer unnecessary operations/context reloads **without lowering the accepted result**. Do not optimize tool count, source size, or character count as a proxy for end-to-end quality.

## Pass rule

The installation/build is accepted only when the relevant sections above pass on the exact source/build being evaluated.

If one section fails:

1. preserve the failing project/revision evidence;
2. identify the single owning layer/cause;
3. repair the shared source when the defect is generic;
4. rerun the smallest affected acceptance section;
5. continue remaining sections only after that boundary is restored.

Do not mark a native incident resolved from static/source/simulated evidence alone.
