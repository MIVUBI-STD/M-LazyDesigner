# LazyDesigner Tool Efficiency Audit

Updated: 2026-09-12

This audit evaluates efficiency by public decision cost, tool-call count, implicit state dependency, duplicate public routes, unnecessary readback, and unnecessary native/UI state mutation. Source line count, file count, and retained executor count are not efficiency KPIs.

## Audit principle

Preserve capability intelligence first:

```text
KEEP validation
KEEP rollback / Undo safety
KEEP native Blockbench semantics
KEEP compatibility-bound executors
KEEP quality / evidence guards
KEEP domain-specific schemas

REDUCE duplicate public choices
REDUCE one-object / one-key / one-pixel loops
REDUCE implicit editor selection/current-state dependence
REDUCE redundant activation / discovery / readback
REDUCE UI fallback exposure
```

A longer internal implementation is acceptable when the public semantic route stays focused.

## Current result

### KEEP — already aligned with efficient MCP operation

| Area | Canonical route | Reason |
| --- | --- | --- |
| Cube geometry | `manage_cubes` | Create and correction batching already exist. |
| Group creation | `add_group(groups=[...])` | Ordered dependency batch, one Undo. |
| Group rename | `rename_element(updates=[...])` | Batch rename plus animation-reference synchronization. |
| Element inspection | `inspect_elements` | Consolidates outline/search/detail while retaining original executors internally. |
| Material authoring | `manage_material` | Consolidates material create/configure/channel/save routes. |
| Material instances | `manage_material_instances` | Consolidates read/set/bulk/clear; explicit bulk path exists. |
| Animation timeline | `manage_animation_timeline` | Consolidates keyframe/graph/timeline/batch/copy-paste. |
| Exact texture work | `paint_texture_transaction` | Bounded deterministic operations, revision guard, one Undo. |
| Particle authoring | `manage_particle` | Ordered operation list already batches document edits. |
| Export | `export_model` | Direct codec lifecycle plus verified file write. |
| History | `undo` / `redo` | Direct native Undo stack; no UI emulation. |

Retained low-level executors behind consolidated tools are intentional implementation detail, not duplicate normal authoring surfaces.

### Discovery exposure

Support/compatibility executors that are fully subsumed by a canonical consolidated route use `discoveryMode=exact_only`.

```text
ordinary intent search
→ canonical consolidated capability only

exact legacy capability name
→ compatibility executor remains directly discoverable
```

Current exact-name-only groups:
- Animation primitives consolidated by `manage_animation_timeline`.
- Material primitives consolidated by `manage_material`.
- Material-instance primitives consolidated by `manage_material_instances`.
- Legacy per-face `apply_texture`.

Unique support capabilities remain normal intent-search candidates when they still own behavior not represented by the canonical consolidated route. This includes `bone_rigging` for IK/mirror, `duplicate_element`, `manage_null_object`, and conditional editor-state helpers.

### SUPPORT — capability retained but should not be the default route

| Capability | Why support-only |
| --- | --- |
| `activate_texture` | Native state helper; redundant when the chosen authoring tool already accepts explicit `texture_id`. |
| `apply_texture` | Legacy per-face wrapper retained for compatibility, not normal Bedrock Entity authoring. |
| `bone_rigging` | Overlaps canonical Group create/reparent/remove/rename/pivot routes; retain mainly for IK/mirror or special rig behavior. |
| `select_all_of_type` | Editor-selection helper. Use only when selection state itself is required. |
| `get_selection` | Read editor-selection/current Texture state only when a native workflow depends on it. |
| `list_locator_elements` | Bounded locator/null discovery helper; detailed authored state belongs to focused inspection. |
| `duplicate_element` | Useful bounded convenience, but repeated cohorts should usually be authored directly as a coherent final geometry batch. |

`select_all_of_type` and `get_selection` remain available on shared AUTHORING but are intentionally excluded from the Animation surface.

### UI FALLBACK — not normal authoring

```text
trigger_action
emulate_clicks
fill_dialog
risky_eval
from_geo_json
```

These remain maintenance/extended compatibility only. The normal `bedrock_entity` registration profile excludes generic UI/import families.

## Overlap finding: `bone_rigging`

`bone_rigging` exposes:

```text
create
parent
unparent
delete
rename
set_pivot
set_ik
mirror
```

The first six overlap existing Geometry ownership:

```text
create      → add_group
parent      → reparent_element
unparent    → reparent_element(parent="root")
delete      → remove_element
rename      → rename_element
set_pivot   → modify_group
```

Normal routing should therefore prefer the canonical Geometry capability, especially where it offers batching or stronger continuation semantics. The semantic routing manifest now enforces this split: ordinary create/parent/unparent/delete/rename/pivot intents resolve to the canonical Geometry capability, while `bone_rigging` is semantically discoverable for `set_ik`, native IK-controller configuration, and `mirror`. The executor remains available for compatibility; no capability is removed.

## P2 batching candidates

### High value: batch `reparent_element`

Current public contract moves one Cube/Group per call. Coherent hierarchy restructuring can require several calls.

Preferred future contract:

```text
reparent_element({
  updates: [
    { id, parent },
    { id, parent },
    ...
  ]
})
```

Requirements before implementation:

- resolve every target and parent before mutation;
- reject duplicate target UUIDs;
- construct the final planned parent graph before mutation;
- reject self-parent and cycles across both current and planned relationships;
- reject no-op rows or clearly report unchanged rows;
- one native Undo transaction;
- preserve local transforms;
- return per-target previous/final parent receipts;
- retain existing single-target form for compatibility.

Implement with LOCAL_CODE/typecheck because hierarchy graph mistakes can produce partial or invalid authored state.

### Medium value: batch `remove_element`

Potentially useful for coherent cleanup, but more destructive than reparenting. Only implement after batch-reparent semantics are proven. Required preflight must deduplicate overlapping parent/descendant removals and include affected animations in one Undo.

### Lower value: batch locator/null updates

Locators and null objects are usually low-count and semantic. Do not expand schema unless real workflow measurements show repeated one-call loops.

### Lower value: batch `modify_group`

Could help multi-pivot/visibility corrections, but must preserve transfer-origin semantics and descendant placement. Do not add merely for symmetry with Cube batching.

## LOCAL_CODE runtime candidate

`paint_with_brush` currently configures native Brush/Color state before deciding whether its request qualifies for the exact-pixel branch.

Preferred order:

```text
read required Painter guard state
→ decide exact-pixel eligibility
→ exact: direct bitmap + native Undo
→ otherwise: configure Brush/Color + native Painter stroke
```

This should be patched only with targeted paint tests and typecheck.

## Efficiency metrics

Track these instead of source size:

1. public capability choices presented per phase;
2. MCP calls required for one coherent user intent;
3. number of implicit selection/current-state dependencies in normal routing;
4. duplicate public routes for the same semantic responsibility;
5. unnecessary discovery/schema/readback calls;
6. mutation-to-verification ratio at coherent cohort boundaries;
7. tools/list payload per phase;
8. structured result payload retained in AI continuation context.

## Semantic collision guard

Canonical capability search aliases plus explicit semantic intents/examples are audited by `mcp/gateway/capabilities/collisionAudit.ts`.

The hard gate rejects a normalized phrase fingerprint when more than one capability claims it. Word order and punctuation do not create a second meaning. Near-similar domain language remains diagnostic rather than a hard failure because legitimate read/write pairs can share nouns.

Current particle ambiguity is intentionally split:

```text
inspect particle emitter / inspect particle molang
→ inspect_particle

author particle emitter / author particle molang
→ manage_particle
```

The same principle applies to hierarchy routing: ordinary create/reparent/rename/pivot ownership remains canonical Geometry capability ownership; advanced IK/mirror remains `bone_rigging`.

A reduction is valid only if quality, native semantics, validation, rollback, and authoring capability remain unchanged or improve.
