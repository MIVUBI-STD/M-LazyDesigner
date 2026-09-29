---
name: lazydesigner-modelling
description: Mandatory LazyDesigner Bedrock Geometry and UV Layout specialist. Use with exactly one Control-delivered modelling profile from the current Reference Package when profile guidance materially improves the task.
---
# LazyDesigner Bedrock Modelling

User-authorized autonomy replaces approval waits with verified checkpoints; never claim user approval.

## Modelling Specialist / Profile Contract

This Skill carries compact operational triggers for the hot-path Geometry/UV specialist. Durable Geometry policy belongs to `docs/03-authoring/modelling/standard.md`; asset-class guidance belongs to the single Control-selected profile under `docs/03-authoring/modelling/profiles/`.

Normal context:
```text
Control → current intent/reference readiness → selected_profile → this Skill → exactly one selected profile
```

Rules:
- accept `selected_profile` from Control; do not rerun broad profile discovery;
- load only that profile; `GENERIC` is fallback when no specific profile materially helps;
- fresh Geometry evidence may return `PROFILE_RECLASSIFICATION_REQUIRED` with the better profile + reason;
- profile reclassification is context-only, not an asset reset or automatic downstream invalidation;
- profile guidance never overrides approved reference evidence, explicit dimensions, user requirements, or safety/verification gates;
- if migration supplies no profile, use the smallest evidence-backed classification; never load all profiles as reassurance.

## Minimum Necessary Evidence
- **No per-Cube inspection ceremony** without a diagnosed problem.
- **No screenshot-per-mutation loop.** Build a judgeable form, then gate it.
- `inspect_model_bounds` only for material envelope/scale/ground/displacement or bounded surface/contact questions; reuse fresh evidence.
- `UNVERIFIED` is not a retry command; request only decision-changing evidence.

## Reference Grounding
For reference-driven visual work, the **actual approved reference image** must be in **active multimodal context**; path/prose/memory is not visual evidence. Unavailable → `BLOCKED`. Bounded nonvisual edits use explicit intent and current authored state.
approved image owns visuals; dimensions own numeric scale; Geometry uses the native LazyDesigner Group/Cube authoring path.
Do not silently change agreed dimensions to improve resemblance. Resolve a material proportion/scale conflict with the user before dependent construction.
Evidence: `SUPPORTED | PROVISIONAL | CONFLICTING | UNAVAILABLE`. View Pair Map only for material front/back, depth, attachment, or 3/4 ambiguity.

When a `lazydesigner-reference-package-v1` package is available, consume its decision-critical semantic parts, profile, blocking/non-blocking unknowns, articulation/material hints, and stage-specific readiness as context. The package is not a Cube plan and does not replace the actual approved image.

### Reference Evidence Contract
Before the first primary Geometry batch, resolve only the structure that can materially change construction:
```text
identity-bearing silhouette
primary mass inventory + required visible part count
attachment/topology graph: parent → contact target → continuity expectation
cross-view width/height/depth evidence for each primary mass
intentional negative spaces/openings and required closed boundaries
asymmetry/orientation that changes construction
identity landmarks that require Geometry rather than Texture
motion participation: rigid | articulated | nonparticipating
pivot/contact/clearance requirement when Animation Required = YES
```
Each item is `SUPPORTED | PROVISIONAL | CONFLICTING | UNAVAILABLE`. `PROVISIONAL` may guide a reversible primary mass only when it cannot change part count, topology, articulation, or identity-critical silhouette. `CONFLICTING` or `UNAVAILABLE` on any such material item → `BLOCKED` before dependent construction.

**Coverage rule:** a visible required part may not disappear merely because one canonical view hides it. Build a primary-part checklist from the approved reference set and account for every required part as `GEOMETRY | TEXTURE | ANIMATION | OMIT(with reason)`. No silent omission, duplicate substitute, filler mass, or unsupported hidden structure.

**Depth rule:** front agreement never closes a mass whose depth remains material. For each primary mass, record depth as `OBSERVED | INFERRED | UNRESOLVED` and identify the view that constrains it. `UNRESOLVED` depth that changes silhouette, attachment, collision/contact, or motion clearance blocks dependent construction.

## Geometry Hot Path
`reference evidence contract → selected profile guidance → semantic form → representation choice → primary batch → Core View Triad → conditional surface integrity → causal correction → Geometry PASS → UV preflight → user review`.

Nontrivial form: **transient Primary Mass Contract**:
```text
mass / evidence views / must-exist reason
cross-view proportions / identity landmarks / surface-only detail reserved for Texture
parent/contact + symmetry/asymmetry
transform owner/pivot + negative-space boundary + representation
```
No per-Cube plan. New whole-form blockout defaults to Core View Triad `front + left + top`; bounded edits use affected views. Add `back` for rear topology/asymmetry; use `front_left_3q` for ambiguity or source-matched fidelity. Never recapture all five routinely.
Repeated/symmetric cohorts: derive once → one coherent `manage_cubes` batch; no per-Cube loop.

## Execution Path Preference
Geometry should mutate native Blockbench objects directly through semantic capabilities. Do not reproduce a human click/drag workflow when the target UUIDs, transforms, hierarchy, or batch intent are already known.

```text
create multiple related Cubes
→ manage_cubes(operation="create") with one coherent elements batch

correct multiple known Cubes
→ manage_cubes(operation="batch_update")

create related bones/groups
→ add_group(groups=[...]) in dependency order

translate one existing Group subtree
→ modify_group(offset=...)

move one known element between parents
→ reparent_element(id,parent)

rename a coherent Group cohort
→ rename_element(updates=[...], dry_run then apply when needed)
```

Rules:
- Prefer explicit UUID/name targeting over editor selection. `select_all_of_type` / `get_selection` are support tools only when selection state itself is required by a native workflow.
- Do **not** use `trigger_action`, `emulate_clicks`, or `fill_dialog` for normal Cube/Group creation, transforms, hierarchy, pivots, UV, or deletion.
- Do not create one Cube per MCP call when the masses form one coherent batch with known coordinates/parents.
- Do not inspect each newly created Cube after a successful deterministic batch. Use the returned identities/effects, then one bounded structural/visual verification at the cohort level.
- For corrections, inspect once only when current exact authored state is stale/unknown; then mutate the whole diagnosed cohort in one bounded operation where available.
- Do not use `duplicate_element` repeatedly for a known symmetric/repeated cohort if one derived `manage_cubes` batch can author the final intended transforms directly.
- Native Outliner/Cube/Group/Undo operations are the intended execution path; Blockbench UI reflecting the result afterward is not UI automation.
- Normal Group/bone create/pivot/parent/rename/delete work stays on `add_group`, `modify_group`, `reparent_element`, `rename_element`, and `remove_element`. Use `bone_rigging` only when IK or bone mirroring is specifically required; its overlapping legacy actions are compatibility-only, not a second hierarchy workflow.

## Semantic Form / Construction / Transform Gate
Before exact coordinates determine:
```text
primary masses + must-exist reason
required count / symmetry or deliberate asymmetry
topology: what attaches to what
required continuous surfaces + intentional negative spaces
representation: geometry | texture | animation | omit
transform ownership + required attachment / contact target/invariant
evidence state
```
`SOLID_CUBOID | PLANE_LIKE | PLANAR_CUTOUT_CARRIER | LAYERED_SURFACE | SEGMENTED_FORM | TEXTURE | OMIT`.

A semantic label never authorizes coordinates. **No orphan/filler Cube**; `PROVISIONAL` placement never verifies it. Construction forms are **not presets**. Use texture for surface information.
Shared orientation/attachment/articulation → **Group/Bone-owned**; local rigid orientation may be Cube-owned. Primary mass: `AXIS_ALIGNED | ROTATED | UNRESOLVED`. Visible slope → pivot role `MASS_CENTER | ATTACHMENT | JOINT | PARENT_TRANSFORM`; attachment/joint pivot owns shared transform. Material `UNRESOLVED` → `BLOCKED`. AABB overlap, hierarchy, or numeric touching is not contact proof.
When `Animation Required = YES`, leave **motion-ready structure**: cohorts, pivots, clearance, contact invariants. A known rig/contact defect does not wait for Animation.

### Ownership reuse / variant guard

Before adding a Group/Bone/Locator for a new clip, controller state, view context, or visual variant:

```text
existing semantic owner sufficient?
→ yes: reuse it
→ no: identify exact missing transform / attachment / deformation capability
→ add only that owner
```

Keep Geometry/Rig complexity, Clip complexity, and Controller complexity as separate budgets. More clips or controller states are not evidence for more hierarchy.

For local state/presentation changes, isolate only the smallest changed geometry/owner branch. First-person/third-person, held/worn, coupled/uncoupled, or related contexts should reuse the base semantic hierarchy when its capability remains valid.

For a moving attachment/reference point, parent the Locator under the correct animated Group/Bone so it inherits motion; current animation authoring targets Group/Bone owners rather than Locator elements directly. Do not replace visible required geometry with a Locator.


## Production-Scale Entity Construction
Large counts, rotated Cubes, per-face UV and Locators can be valid. Locator = lightweight attachment/effect anchor. Visible Bounds = native culling/export metadata; check animation extremes.

## Primary Mass / Proportion / Depth
Coordinates follow one coherent volume interpretation. Derive adjoining masses from shared boundaries; judge landmark size/spacing against the whole form before secondary detail.
`frame/envelope → primary masses → shared boundaries → cross-view proportions → depth/layering → silhouette/proportion gate → primary blockout`.
Front/back constrain width+height; sides depth+height; top width+depth. **Front agreement does not certify depth.** Depth: `OBSERVED | INFERRED | UNRESOLVED`. Minor drift → one interpretation. Do not average drift. Only unresolved material conflict becomes `BLOCKED`.

## Surface Coverage / Negative Space
**do not force universal watertight geometry**; designed openings remain open.
Relations: `CLOSED_BOUNDARY | INTENTIONAL_OPENING | LAYERED_OFFSET | INTENTIONAL_INTERSECTION | CUTOUT_CARRIER`.
For adjacency/layer/contact use fresh views + one bounded `inspect_model_bounds`. Each required surface class needs current evidence once. Review `z_fighting | micro_gap | coplanar_edge_gap | shallow_penetration`; overlap alone never proves correctness.

## Geometry Detail Budget
Decide representation **before** counting Cubes.
`GEOMETRY` → 3D silhouette/volume/opening/contact/negative-space boundary/layering/motion.
`TEXTURE` → surface pattern/color/seam/panel line/marking.
`OMIT` → unsupported/immaterial.

Detail-only span/thickness `<= 4 Blockbench units` is an **anti-overcube guardrail, not a classifier**. Challenge 3D need. `PLANAR_CUTOUT_CARRIER`: 1 plane or 2 crossed planes when alpha owns the silhouette; exact arrangement follows the selected profile/reference rather than a fixed ritual angle. One zero-span axis may be plane-like Geometry; 2+ collapsed axes are unusable.

## Verification / UV / Correction Deep Reference

Keep the hot path compact. Load `references/verification-uv-correction.md` only when the task reaches one of these states:

- judging current Geometry against the approved reference;
- Geometry is user-approved and production UV layout begins;
- a local correction/convergence loop is active;
- continuation/evidence recovery after mutation or reconnect is required.

Hot-path invariants remain:

- Geometry PASS requires fresh evidence for form/depth, required surfaces, hierarchy/pivots, and no major defect; tool success or bounds alone never create PASS.
- Fix the largest structural difference first and reject cross-view regressions.
- Production UV begins only after **user Geometry APPROVED**; native UV/template audit hygiene is not itself UV Layout PASS.
- Correction reuses fresh state/evidence, never auto-retries `UNKNOWN_OUTCOME`, and stops/blocks when repeated causal corrections fail without new evidence.

## Existing Assets / Shared Session
Existing geometry is a baseline, not fidelity proof. Geometry owns shape/rig/UV; Texturing pixels/PBR. Geometry↔Texturing stays shared AUTHORING; `HANDOFF_REQUIRED` + `switch_authoring_phase` only for AUTHORING↔Animation.