# Minecraft Bedrock Entity Workflow

Bedrock **Entity**: Cubes = geometry; Groups = bones.

Authorized autonomy replaces approval waits with verified checkpoints. Use autonomous readiness at handoff; never claim user approval.

## Canonical Authoring Stages

Keep these terms separate:

```text
GEOMETRY        = 3D form, proportion, topology, attachment
UV LAYOUT       = geometry → atlas coordinate mapping; no color/style
TEXTURE ATLAS   = bitmap/PNG canvas that stores pixels
TEXTURE STYLING = color, material, shading, highlights, detail
TEXTURE VERIFY  = fresh atlas + mapped-model visual validation
```

`create_texture`: blank = Texture Atlas; template = native Geometry-owned UV Layout + atlas. Neither completes Texture Styling. UV fields belong to Geometry; Painter pixels to Texture Styling.

## Minimum Necessary Evidence

Internal PASS means READY_FOR_USER_REVIEW. Explicit user Geometry APPROVED precedes UV Layout PASS; user Texture APPROVED and a saved .bbmodel checkpoint precede Animation/finalization. Geometry and Texturing share AUTHORING; only AUTHORING/Animation transitions use Gateway handoff in the same task.

Reuse fresh tool state. Do not inspect every Cube, capture after every mutation, or call `get_project_info` after known create/export state. `inspect_model_bounds` is for envelope/scale/ground/displacement or bounded surface/contact review. `UNVERIFIED` is not a retry command.

Reference-driven work requires the actual approved image in active multimodal context. Path/memory is not image evidence. Missing material reference evidence → `BLOCKED`.

Use the single native LazyDesigner Geometry path: create the project, establish required Groups/Bones and Cubes, set explicit positions/sizes/parents/transforms, then capture judgeable views for visual review. Do not revive retired external/3D-assisted modelling routes.

## Simple Rigid Fast Path

For a clear predominantly rigid object with simple topology and no material cross-view conflict:

```text
identity + envelope + primary masses
→ representation choice
→ transform ownership
→ minimum meaningful hierarchy
→ one coherent primary Cube batch
→ judgeable views
→ correct only observed mismatch
```

Construction examples are **not presets**. Rigid slopes may be **Cube-owned**; shared transforms/contact/articulation are **Group/Bone**-owned. Use the minimum sufficient Bedrock-native geometry; add segmentation only when it materially improves silhouette, volume, negative space, contact, layering, transform ownership, motion, or a technical requirement. After primary `PASS`, add identity-weighted detail.

Use evidence maps only for material ambiguity in identity, count, topology, depth, attachment, negative space or orientation; skip them for clear rigid references.

## Geometry / Visual Gate

No `evidence_map`, `reference_grounded_v1`, role namespaces or compiler strategies for ordinary Geometry. Decide masses, counts, contacts, negative spaces, representation and transforms before a coherent batch; no automatic coordinate inference.

Reuse returned UUID/from/to/origin/rotation/`box_uv_region`; do not immediately re-inspect fresh Cubes. Tool success is execution evidence only.

Judge reference fidelity **difference-first** with fresh model views. Check identity, masses/counts, silhouette/proportion, depth, orientation, contact, and negative spaces. For a bounded unanswered claim, prefer `capture_model_views(evidence_targets=[...])` so Runtime deterministically chooses the minimum useful canonical view set; use explicit `views` only when reference correspondence or a nonstandard question requires them.

```text
FAIL       = critical/major supported mismatch
UNVERIFIED = missing/ambiguous material evidence
PASS       = no critical/major supported mismatch
```

**Front PASS is not full 3D PASS** when depth evidence is missing or fails. Coordinates, bounds, hierarchy, export success, or similarity scores cannot create visual `PASS`.

Known major mismatch stays FAIL despite earlier approval; never submit as READY_FOR_USER_REVIEW. Use side/bottom views for concealed contacts; distinguish dark paint from missing geometry.

Correction: reuse fresh target state; otherwise inspect once. For a visual mismatch emit one compact authoring intent: `target + difference{criterion,severity,view,delta,claim_id?} + correction_family + exact geometry_operations + preserve`. Use `TRANSLATE | RESIZE | ROTATE | REATTACH | LAYER_OFFSET | SPLIT | MERGE_REMOVE | ADD_MASS`; keep `delta` to one observable mismatch, not prose. Execute one coherent cohort, verify `geometry_effect`, then compare `IMPROVED | UNCHANGED | REGRESSED` from affected view(s) only. Same causal direction failing twice without new evidence → `BLOCKED`.

## UV Layout

UV Layout: **which atlas region does each surface read?**

Reuse `manage_cubes` returned `box_uv_region`. Keep auto UV active during Geometry correction. After explicit user Geometry APPROVED, use `create_texture(type=template)` and its `uv_audit`; rebuilding the single atlas requires `texture_id` and invalidates affected texture evidence. Lock final Box UV with `autouv=0`; `list_textures(diagnostics=true)` audits existing UV; use diagnostics=false for identity discovery without pixel scans.

Require integral physical pixel mapping, no invalid/out-of-bounds UV, no accidental partial overlap, deliberate exact reuse/mirror, and stable seam/orientation. Fractional logical UV is diagnostic, not failure when the bitmap scale maps it to whole pixels. Use `inspect_elements(mode=detail)` only when face-specific mapping/orientation is actually needed; one Cube inspection returns all faces.

Review/park: reconcile README/report with artifact revision; separate operation, technical, visual and user verdicts. Preserve rejection history; missing usage is UNKNOWN. Never silently replace dimensions. Check neutral/extreme contacts, semantic UV grouping and identity patches using current specialist procedures.

## Texture Atlas

Check sub-unit Box UV collapse; prefer per-face UV over thickening. Keep density; verify minimum native packing, padding, pixel preservation and Undo.

Use **one base-color atlas PNG** for the whole model, never one base color per body part/Cube/material zone. Blank atlases require explicit dimensions; 128×128 is the default only without an approved size. Approved bitmap size/density takes precedence, and native template logical UV may differ from physical pixels. Do not rely on the provisional 16×16 default. Reuse atlas UUID and pass `texture_id` when multiple textures exist. PBR support textures are additional atlas channels, not UV Layout.

Atlas creation/fill does **not** complete Texture Styling.

## Texture Styling

Define palette roles, value/hue ramp, material zones, face-aware shading, contact/occlusion, edge treatment, hard-pixel/alpha intent, seam/orientation, identity marks, detail budget, and pixels per UV unit.
Verify an adjoining surface pair first. Separate palette from lighting; keep shading continuous across Cubes. Replace wrong material designs, not patch overlays. Better/HD preserves density, resolution and style.

Flat fill is a **BASE PASS only**, never production completion when material/form/detail is visible. Prefer controlled Minecraft pixel clusters and stepped ramps; random noise is rejected. Smooth gradient is optional only when the reference/style supports it.

Corrective batches preserve unaffected shading/identity; coordinate masks encode observed landmarks, not generic bands. Inspect adjoining surfaces. Coverage `varied` is pixel variation, not style/fidelity.

The approved image owns material zones, seams, highlights and identity. A generic palette, unrelated copied texture, or five flat rectangles is an invalid production result.

```text
BASE PASS             → draw_shape_tool; paint_fill_tool only for intentional contiguous base fill
VALUE / FORM PASS     → draw_shape_tool / paint_with_brush for stepped form, contact, occlusion, edge, hue/value ramp
IDENTITY PASS         → paint_with_brush exact-pixel identity marks
SECONDARY DETAIL PASS → controlled detail by pixels per UV unit; stop before noise
VERIFY                → enter Texture Verify
```

Use `gradient_tool` only for supported continuous transitions. Repeated same-color disconnected detail can be one `paint_with_brush` coordinate batch with `connect_strokes=false`.

## Texture Verify

After a coherent styling pass:

```text
fresh get_texture atlas
+ affected capture_model_views
→ UV/region
→ palette/material
→ form/contact/edge
→ seam/orientation
→ identity
→ microdetail
→ FAIL | UNVERIFIED | PASS
```

`paint tool succeeded`, `atlas exists`, or `BASE PASS` alone cannot advance the stage. Styling remains `FAIL`/`UNVERIFIED` until the fresh atlas visibly contains authored reference-derived detail and the mapped model views show it on the intended surfaces.

Painting stales evidence. `FAIL` → causal correction → affected evidence → `IMPROVED | UNCHANGED | REGRESSED`; same cause failing twice → `BLOCKED`.

## Stage Routing

```text
project absent              → create_project
new reference geometry      → create_project → add_group/manage_cubes/modify_group → capture_model_views
observed geometry mismatch  → reuse target state; inspect if missing/stale → manage_cubes/modify_group → affected capture_model_views
UV Layout                   → returned box_uv_region → final UV lock → list_textures audit
Texture Atlas               → create_texture / activate_texture
Texture Styling             → Painter tools / material configuration
Texture Verify              → get_texture + capture_model_views
file deliverable            → export_model
```

Protected gaps remain TextureMesh direct authoring, visible bounds, animated textures, and bone-binding expressions.
