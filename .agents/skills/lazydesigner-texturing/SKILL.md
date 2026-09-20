---
name: lazydesigner-texturing
description: Mandatory LazyDesigner Bedrock Texture specialist.
---
# LazyDesigner Bedrock Texturing

Geometry/UV capabilities remain callable for bounded upstream correction; Texturing **must not borrow Cube mutation**.

User-authorized autonomy replaces approval waits with verified checkpoints; never claim user approval.

## Control Context Projection

Start from LazyDesigner Control's stage-specific Texturing projection; do not reload the complete Modelling Profile or Reference Package.

Keep only decision-relevant context: current texture request, asset/profile label, Geometry APPROVED + UV Layout PASS, affected semantic/material IDs, identity markings/palette, render/PBR/alpha/emissive requirements, relevant approved reference views, current atlas/UV identity, and texture-stage blockers.

If a decision-critical item is missing, request only that exact context through Control. Do not broaden into full-profile/reference loading as reassurance.

## Pixel Art Reference Intake

Pixel Art is conditional reference evidence, never a second Texturing workflow. When an approved Pixel Art artifact exists, consume only its compact visual handoff: identity, target grid/scale, authoritative palette/material/marking/alpha/orientation/style constraints, provenance, and blockers.

Do not inherit production UV/atlas coordinates, Blockbench texture IDs, material-instance/render-profile state, mapped-surface PASS, or particle runtime semantics from Pixel Art. Actual UV mapping, atlas mutation, render/material state, and mapped-model verification remain Texturing-owned.

Use the active handoff facts directly. Load `docs/02-reference/pixel-art/texture-reference.md` only when the Pixel-Art→Texturing boundary or missing visual contract is materially unclear; never load the full Pixel Art corpus as reassurance.

## Asset-Only Visual Runtime Boundary
No RP dev: opaque/cutout/blend/emissive; Texture variants asset-only.

## Entry / Correction
**No Geometry↔Texturing phase switch.** AUTHORING↔Animation only: `HANDOFF_REQUIRED` + `switch_authoring_phase`.
Entry: **Geometry APPROVED + UV Layout PASS**; final Box UV locked with `autouv=0`, no invalid/out-of-bounds/partial-overlap.
unlocked/invalid UV → Geometry owner + bounded UV correction; no phase switch.

## Direct Routing
Reuse fresh state.
```text
discovery → list_textures(diagnostics=false); UV/atlas readiness → list_textures(diagnostics=true)
face mapping → inspect_elements(mode=detail) only when needed
blank atlas resolution unknown → get_project_info once
atlas → list_textures / activate_texture / create_texture / get_texture
exact/deterministic pixel mutation → paint_texture_transaction
native fill/shape/brush/eraser behavior → paint_fill_tool|draw_shape_tool|paint_with_brush|eraser_tool
PBR/material semantics → manage_material / manage_material_instances
render/preview → declared profile + mapped-model evidence; explicit file integration → manage_render_profile
```
Unknown → `search_capabilities(limit=4)`. No confirmation rereads.
**Pin atlas UUID and pass `texture_id` when multiple textures are loaded.**

## Execution Path Preference
Choose the cheapest executor that preserves the required visual behavior. Do not route through a native UI/Painter state merely because it resembles how a human would perform the edit.

```text
known exact RGBA/pixel coordinates
→ paint_texture_transaction

bounded repeated fill/erase/copy/noise over known pixels
→ one paint_texture_transaction when representable

artistic brush stroke / soft brush / connected stroke
→ paint_with_brush

native flood-fill semantics
→ paint_fill_tool

native shape semantics
→ draw_shape_tool

reference-supported continuous transition
→ gradient_tool

sample an already-authored pixel whose value is unknown
→ color_picker_tool
```

Rules:
- If the intended color is already known from the reference/palette/previous evidence, pass the color directly; **do not call `color_picker_tool` just to put a known value into Blockbench's active color slot**.
- Before looping the same mutation capability, ask whether the targets form one coherent same-owner cohort whose intermediate states do not change the next decision; if yes, use the existing transaction/batch route.
- Prefer one coherent `paint_texture_transaction` over many one-pixel Painter calls when the result is deterministic and transaction operations can express it.
- Prefer native Painter only when brush/fill/shape behavior itself is part of the required result.
- Exact-data operations do not need proof that a Blockbench brush, slider, preset, or color slot was touched.
- Do not use `trigger_action`, `emulate_clicks`, or `fill_dialog` for normal texturing. Those are maintenance/UI fallbacks, not authoring executors.
- Do not call `activate_texture` immediately before a tool that already accepts explicit `texture_id` unless active-editor state itself is required for a subsequent human/native action.
- Batch a coherent texture-owned correction before verification; do not verify after each pixel/stroke.

## UV Gate
`uv_audit.production_gate`=ready = hygiene, **not UV Layout PASS**; review face aspect ratio, texel density, semantic UV reuse.
Requested atlas size/density are constraints; never silently enlarge; return to Geometry/UV if detail cannot fit.

## First Call
`blank create_texture → explicit width+height from project UV`; **not omit blank Atlas size**.
`create_texture`: provisional **16×16 blank**; **128×128 default, 256×256 opt-in**. Approved atlas/density takes precedence; reuse its UUID.

## Workplan / Coverage
material cohorts; palette roles `BASE | SHADOW | HIGHLIGHT | ACCENT/IDENTITY`; form/contact/occlusion/edge/identity/detail.
Face Coverage Ledger: `UNPAINTED | BASE_ONLY | STYLED | INTENTIONAL_FLAT | INTENTIONAL_TRANSPARENT | SHARED`.
`list_textures.optimization_opportunities.coverage.gate`: `incomplete|partial` / `FACE_ACCOUNTING_INCOMPLETE` → no completion; one `list_textures`/pass; `ready` ≠ visual PASS.
`states.varied` ≠ `STYLED`; `review.solid_color_faces` locates flat candidates, not failures.
Variants: `list_textures.production_alignment.gate=ready`; `seam_continuity` (intra-Cube only; inspect cross-Cube contacts visually); `pbr_content`.

## Reference Fidelity Contract
Reference-driven Texturing inherits the approved visual authority used by Geometry; it must not invent a new interpretation merely because UV islands differ from the reference projection.

Use the Control projection as the first material contract. Before broad paint propagation, resolve only applicable entries:
```text
material/color region → matching reference evidence
identity marking → required location/orientation/relative scale
value structure → light/base/shadow relationship without baking scene lighting
pattern direction/scale → mapped-surface continuation requirement
transparent/cutout region → silhouette owner and render requirement
hidden-but-required surface → evidence or explicit intentional treatment
```
Evidence remains `SUPPORTED | PROVISIONAL | CONFLICTING | UNAVAILABLE`. A material identity marking, major region boundary, or cutout silhouette that is `CONFLICTING`/`UNAVAILABLE` must not be replaced with generic decoration and called fidelity.

Reference comparison is **mapped-surface-first**, not atlas-image-first. Compare the actual mapped model against the approved reference at comparable view/scale; the atlas is implementation evidence only. Preserve Geometry-owned part boundaries: Texture may clarify form, but must not paint around a missing/incorrect mass, attachment, opening, or joint defect to simulate correctness.

Prioritize correction by visible identity impact:
```text
wrong/missing identity marking
→ wrong major material/color region
→ broken mapped continuity / invented seam
→ wrong pattern direction or scale
→ wrong value/form read
→ secondary detail/noise
```
An improvement on one island is `REGRESSED` if the mapped model introduces a material seam, mirrored identity error, or cross-surface discontinuity elsewhere. Do not let atlas neatness override mapped fidelity.

## Correction Convergence
One visible cause owns one correction round. Reuse the latest atlas UUID, mapped-face state, mutation receipt, and fresh comparable capture when they already answer the next decision.

Do not repeat `list_textures`, `get_texture`, face-detail inspection, or mapped captures merely to reconfirm a successful paint mutation. Refresh only the evidence class made stale by the change or needed to detect a likely regression.

```text
FAIL
→ identify one texture-owned cause
→ one coherent patch/cohort mutation
→ affected mapped-surface verification
→ IMPROVED | UNCHANGED | REGRESSED
```
If verification reveals Geometry/UV ownership, stop Texturing correction and return the bounded defect upstream. Same texture-owned causal direction twice without new evidence → `BLOCKED`; do not produce a third palette/pattern variation as guesswork.

### Reference-Grounded Palette / Atlas-Island Discipline
Integer texels; **pixels per UV unit** owns detail scale. Build stepped hue/value ramps, contact shadows and highlights from observed form. Surface coordinates keep shading continuous across Cubes; UV edges do not invent seams.
Unused atlas pixels stay transparent; opaque material does not authorize full-canvas fill. Paint mapped islands plus deliberate bounded padding only.
Pixel art must read as deliberate clusters at normal model scale with Shading ON: distinct shadow/base/light masses, folds and identity accents. Barely visible noise or smooth formula variation is BASE_ONLY, never STYLED.

## Texture Styling
generic palette; copied unrelated texture; flat rectangles/random high-contrast noise ≠ completion.
`BASE PASS → VALUE / FORM PASS → SURFACE PATTERN PASS → IDENTITY PASS → SECONDARY DETAIL PASS → RENDER / ALPHA VERIFY → VERIFY`.

### Render / PBR / Paint Safety
Namespaces: `render_profile`+`minecraft_material_code` | `pbr_texture_set` | `geometry_material_instance` | `surface_pattern`; `render_mode` preview-only.
cutout=`entity_alphatest`; translucent=`entity_alphablend`; emissive_mask=`entity_emissive`. Alpha follows render_profile; planar carrier silhouette stays alpha, not Cubes.
Variants preserve production base role + compatible dimensions/mapping; `normal XOR height`.
`authoring_status`; MERS=MER+`subsurface_value>0`.
`paint_settings`: `pixel_perfect`, `lock_alpha`, `paint_side_restrict`; Mirror after semantic symmetry.
Brush settings/presets affect native brushes, not exact-pixel transactions. Configure only the chosen executor; a transaction does not prove brush/plugin use.

## Coherent Styling Window / Anti-Micro-Loop
representative patch/cohort → cohort-wide; formula/gradient/color count is not quality evidence.
Finish an identity-critical patch and adjoining body surface pair before propagation. Compare landmarks, value clusters, pattern direction/scale and seams against the actual reference at matching scale. Generic bands cannot replace observed detail. This is internal verification, not a user gate.
**No evidence-per-micro-mutation loop.**
Preserve unaffected shading/identity during correction. Coordinate formulas execute observed designs, not invent them. Dark patches may be paint, occlusion or missing surfaces: diagnose the owner before repainting.

## Texture Verify
Reference + fresh `get_texture` + fresh **mapped model-view evidence** from `capture_model_views` → `FAIL | UNVERIFIED | PASS`.
Record capture view, front direction, Shading ON and artifact revision. Blockbench preview is not actual in-game lighting proof. Off/unknown shading cannot support final comparison.
Verify required hidden material surfaces.
`FAIL` → **smallest bounded causal correction** → one fresh affected evidence bundle → `IMPROVED | UNCHANGED | REGRESSED`; same causal direction twice → `BLOCKED`.
Never use stale exported PNG/bbmodel.

## Stage Projection Exit
When Texturing reaches a review/handoff boundary, return only stage-relevant state to Control:

```text
changed material/texture cohorts
current atlas/texture identity
affected semantic part IDs
texture evidence freshness
upstream Geometry/UV blocker if discovered
texture-stage blocking unknowns
READY_FOR_USER_REVIEW | BLOCKED | HANDOFF_REQUIRED
```

Do not return or persist the whole modelling profile as texture state.

Animation → user Texture APPROVED + checkpoint → Animation Readiness Preflight → `HANDOFF_REQUIRED` → Gateway `switch_authoring_phase`, same task.
Handoff: `target_phase="animation"`, `reason`, `resume_from`, and object `readiness`:
```json
{"geometry_approved":true,"uv_layout":"PASS","texture_approved":true,"checkpoint":"<saved .bbmodel path>","no_blockers":true}
```
Never infer approval.

## Conditional Support — Not Default Routing
Conditional on user intent; not normal hot path.
`gradient_tool | color_picker_tool | copy_brush_tool | paint_settings | create_brush_preset | load_brush_preset | texture_selection | texture_layer_management | add_texture_group | list_materials | get_material_info | import_texture_set`.
`gradient_tool`: reference-supported continuous transition; no extra discovery/readback.
`color_picker_tool`: sample an existing pixel only when its exact authored value is unknown; never use it to re-enter a color already known from current evidence/palette.