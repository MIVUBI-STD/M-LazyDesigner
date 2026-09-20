---
name: lazydesigner-animation
description: LazyDesigner Minecraft Bedrock Entity animation specialist.
---

# LazyDesigner Bedrock Animation

Use at `ACTIVE PHASE: ANIMATION` after Texturing approval + checkpoint + Animation Readiness Preflight when participating hierarchy/pivots are suitable.

User-authorized autonomy replaces approval waits with verified checkpoints; never claim user approval.

Durable Animation policy is owned by `docs/03-authoring/animation/standard.md`; this Skill is the compact execution specialist for the active Animation stage and must not become a competing policy owner.

## Control Context Projection

Start from LazyDesigner Control's stage-specific Animation projection; do not reload the complete Modelling Profile or Reference Package.

Keep only motion-relevant context: current animation request, approved checkpoint state, participating semantic IDs, parent/child articulation, pivot/axis intent, contact/clearance requirements, relevant pose/keyframe/deformation guidance and approved reference views, current clip identity/state, and animation-stage blockers.

If a decision-critical motion relationship is missing, request only that exact context through Control. Never broaden into full-profile discovery as reassurance.

## Boundary

Animation owns motion, not structural rig mutation. Blocker → `HANDOFF_REQUIRED`, `target_phase: geometry` + readiness → `switch_authoring_phase` → resume same task through Gateway; if motion structure is unsuitable, handoff Geometry first. Before keys, representative extreme poses preserve contact/clearance. Do not search for `bone_rigging`.

## Artist-Facing Controller Boundary
Animation Controller is artist-facing composition/preview for transition/blend continuity and effects; BP/gameplay integration is out. `resource_operations` is **not a normal asset-authoring route**.

Particle is asset-only. `particle-reference`: Direct Runtime/Inspector only; no client-entity wiring.

## Direct Routing

```text
new animation                         → create_animation
unknown animation/controller          → inspect_animation
all timeline/keyframe work            → manage_animation_timeline (operation: keyframes|graph|timeline|batch|copy_paste)
clip/native property cohort           → manage_animation_timeline (operation: properties)
existing animation effects            → manage_animation_effects
particle inspect/create/patch/save/preview → inspect_particle / manage_particle
controller state/composition/effects  → manage_animation_controller
nested controller/blend curve         → same tool (native_operations)
pose/time visual evidence             → capture_model_views(animation_preview)
```

`new known clip → create_animation → reuse returned UUID/state; timeline if needed`
`existing/unknown detail → inspect_animation`

Known → Gateway; unknown/stale → `search_capabilities`; schema → `describe_capability` once. Reuse fresh UUID/state; known identity must not fall back to broad hierarchy discovery or confirmation reads.

`batch` uses operation="batch" + batch_operation= for one coherent cohort, not loops per key. `properties` owns clip state; `native_operations` nested controllers/curves. Controller/effect/graph/copy-paste are conditional.

## Execution Path Preference
Use semantic/native animation capabilities directly. Do not emulate the Blockbench timeline UI when the Runtime already exposes the underlying Timeline/Animator behavior.

```text
create a coherent new clip with known numeric keys
→ create_animation once

create/edit/delete multiple related keys
→ manage_animation_timeline(operation="keyframes") with one bone/channel cohort

repeat/pattern/range correction across many keys
→ manage_animation_timeline(operation="batch")

play/pause/stop/set_time/select_range
→ manage_animation_timeline(operation="timeline")

clip properties / length / fps / loop / Molang properties
→ manage_animation_timeline(operation="properties")

sound / particle / timeline effects
→ manage_animation_effects

controller composition / transitions / nested controller operations
→ manage_animation_controller
```

Rules:
- Do **not** use `trigger_action`, `emulate_clicks`, or `fill_dialog` for normal animation playback, timeline navigation, keyframes, graph edits, controllers, or effects.
- Prefer one bounded keyframe/batch mutation over loops of one-key calls when a coherent cohort shares the same correction intent.
- Reuse the animation UUID returned by creation/mutation; do not reselect or rediscover the clip merely to confirm identity.
- Do not call `inspect_animation` after every successful deterministic mutation. Inspect only when required state is unknown/stale or when the next correction depends on a field not present in the mutation receipt.
- Do not repeatedly `set_time` to collect static evidence. Prefer one bounded `capture_model_views(animation_preview)` request across the representative times required by the verdict.
- Timeline selection/view expansion is editor state, not authored motion. Change it only when it materially supports evidence or a native operation that depends on selection.
- Native Timeline/Animator API calls are the intended execution path; the fact that Blockbench UI updates afterward does not make them UI automation.

## Rig / Clip / Controller Budget

Keep three budgets distinct:

```text
rig → transform / attachment / deformation capability
clip → authored motion / pose inventory
controller → state / transition / blend composition
```

New clips and controller states reuse existing semantic owners unless playback/reference evidence exposes a missing structural capability. Do not request hierarchy growth merely because animation or controller count grows.

Presentation contexts may use different transforms, clips, or local geometry branches while preserving the same base rig when that rig remains semantically sufficient.

If a requested motion cannot be expressed cleanly with the existing pivot/parent/clearance relationships, hand off to Geometry; do not compensate with denser keys or controller complexity.

Locators are not direct animation targets in the current authoring path. A moving attachment/reference Locator must inherit motion from its parent Group/Bone; wrong parent ownership is a Geometry blocker.

## Motion Design Contract

Before keys define only applicable facts (no foot-plant/gameplay contract for an unrelated mechanical loop):
```text
archetype + intent + duration/snapping
primary driver + counter-motion + followers
phase + contact/attachment invariants
support/flight/impact events + center-of-mass path + foot plant/release times
authored-key vs Molang ownership
external query/variable caller semantics + units/default/reset/direction
causal event for sound/particle
loop seam or neutral/controller handoff
```

Archetypes are not presets. No universal FPS, duration, amplitude, phase, keyframe count, or Bezier target. Do not use an animation quality score.
Author the smallest judgeable motion cohort first. Validate its contact and curves before propagating followers. Dense baked samples need a specific interpolation/export reason; mathematical offline generation or many keys does not prove advanced motion. Record what visible behavior each Molang expression owns, not merely that math exists.

## Keyframe Reference Fidelity Contract
When the user supplies animation/keyframe/pose reference, it becomes the motion authority for visible pose intent. Geometry remains authority for actual bone hierarchy, pivots, attachments, and feasible deformation; Animation must not force keys that compensate for a wrong rig.

Use the Control projection as the first motion contract. Before production keys, establish only applicable relationships:
```text
reference pose/event → target time or phase role
participating bone chain → driver + followers
root/COM direction → weight/load intent
contact/attachment invariant → what must stay planted/connected
joint neighborhood → expected bend direction + closure/clearance
silhouette landmark → required pose read from relevant view
secondary motion → delayed/follow-through relation
transition/loop relation → entry, exit, or seam expectation
```
Each item is `SUPPORTED | PROVISIONAL | CONFLICTING | UNAVAILABLE`. If a reference-critical limb, joint direction, contact, or attachment cannot be achieved without excessive separation, penetration, or implausible compensation, stop Animation and hand off to Geometry; do not hide the defect with extra keys.

Reference fidelity is **pose-correspondence-first**, not key-count-first. Compare representative reference poses against current animation at comparable view and phase. A technically smooth curve is still `FAIL` if the pose silhouette, joint closure, contact, or action timing contradicts the supplied reference.

For articulated characters/creatures, explicitly inspect motion-critical gaps at hip/groin, knee, ankle/foot, shoulder, elbow/wrist, neck, waist, jaw/cheek, and any custom hinge only when those regions participate in the current motion. Do not automatically inspect every joint in the asset.

Required rule:
```text
joint rotates through intended range
→ adjacent forms preserve believable overlap/closure
→ no excessive open seam
→ no collision that materially changes silhouette
→ contact/attachment remains intentional
```
Do not solve an open joint by scaling/deforming unrelated geometry through animation unless that behavior is explicitly part of the design.

Prioritize correction by motion impact:
```text
wrong participating bone/rig blocker
→ wrong primary pose silhouette / action direction
→ broken contact or attachment
→ excessive joint gap / penetration
→ wrong timing / phase / weight transfer
→ missing counter-motion / follow-through
→ secondary polish/easing
```
A correction is `REGRESSED` if the target pose improves but another required reference pose, contact phase, loop seam, or neighboring joint becomes materially worse.

## Correction Convergence
Treat each failed motion review as one diagnosed motion cause, not an invitation to add keys broadly.

```text
FAIL
→ identify first wrong motion/rig cause
→ reuse current animation UUID + fresh inspected state/playback evidence
→ mutate one coherent bone/channel cohort
→ recapture only affected reference pose/time or replay the affected loop segment
→ IMPROVED | UNCHANGED | REGRESSED
```
Do not repeatedly `inspect_animation`, re-search capability schemas, or recapture unchanged times between coherent keyframe mutations. A fresh timeline mutation receipt remains authoritative for authored state; visual/playback evidence is refreshed only where the mutation can change the verdict.

If the same causal direction fails twice without new evidence, `BLOCKED`. Do not add denser keys, stronger easing, or extra follower motion as a third guess. If the blocker is hierarchy/pivot/contact geometry, hand off to Geometry immediately and preserve the current animation evidence for resume.

Use Molang for continuous/cyclic/reactive **visual motion**; authored poses own identity-critical action/contact/silhouette. `q.anim_time` is time-driven; `q.modified_distance_moved` can own travel phase. External gameplay callers remain integration contracts; never invent caller values or signed reverse semantics. Chains use `driver → delayed followers`. Actions preserve `anticipation → action/impact → follow-through → recovery`.

### Molang / math

No separate math tool. Author Molang through existing transforms/properties/controller/effect fields. Accept official trig, clamp/rounding, interpolation, exponential/power, random/die-roll, `math.pi`, and `math.ease_{in|out|in_out}_{back|bounce|circ|cubic|elastic|expo|quad|quart|quint|sine}`. Easing math is version-sensitive; trig uses degrees.

Molang route: `create_animation(bones={})` → returned UUID → `manage_animation_timeline(operation="keyframes", action="create", values=[expressions])`, one bone/channel cohort per call. Creation accepts numbers only; do not bake continuous expressions merely to fit it. Contact-critical motion still requires native review.

File-backed client/runtime wiring remains compatibility/inspection, not normal model creation. Never `risky_eval` or evaluate gameplay truth.

## Evidence Economy

Do not `set_time` repeatedly. One `capture_model_views` with explicit times; `views × times <= 8`.

```text
AUTHOR coherent keys/batch
→ capture representative times
→ focused inspect only when evidence can change correction
→ one causal correction
→ recapture affected cohort
```

Verify `DISCOVER → AUTHOR → VERIFY → CORRECT → VERIFY → DONE`; record `IMPROVED | UNCHANGED | REGRESSED`. Cyclic/idle verification requires repeated full-loop playback; three static snapshots do not prove timing/phase/contact/seam.
Observe at least three consecutive cycles for cyclic review. Check only motion-relevant contact, sliding, penetration, weight transfer, follow-through and loop continuity. Action clips also require landing/recovery and any intended preview transition. Retain a playable evidence clip with revision, duration and view at review boundaries. Playback unavailable or interrupted means `UNVERIFIED`, not a replacement static PASS.

## Stage Projection Exit

At a review/handoff boundary, return only animation-stage state to Control:

```text
changed animation clip / controller / effect IDs
participating semantic part IDs
articulation relationships used
current playback/evidence freshness
upstream Geometry blocker if discovered
animation-stage blocking unknowns
READY_FOR_USER_REVIEW | BLOCKED | HANDOFF_REQUIRED
```

Do not persist or return the complete Modelling Profile as animation state.

## Completion

Internal `PASS` = `READY_FOR_USER_REVIEW`. User approval → checkpoint → Finalization.
Endpoint counts are not playback proof; Molang must serve motion, never a math-presence quota.

Protected gap: bone-binding expressions beyond `relative_to.rotation=entity`. Source/CI does not prove live Blockbench/Minecraft playback.