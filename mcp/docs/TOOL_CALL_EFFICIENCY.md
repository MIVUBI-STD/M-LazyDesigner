# BlockIT Authoring Tool-Call Efficiency

Canonical evaluation contract for minimum necessary authoring calls. This is **not** a Runtime planner, fifth Gateway tool, or replacement for specialist judgement.

The objective is **Cost to Accepted Result**: remove calls that do not change the next decision while preserving reference fidelity, technical correctness, and user review gates.

## Global Rules

```text
known capability + known arguments -> invoke directly
unknown capability                -> one search_capabilities(limit=4)
schema materially uncertain       -> describe_capability once
fresh mutation state              -> reuse receipt/state; no confirmation readback
visual mutation                    -> refresh only evidence that can change the verdict
state materially stale/lost       -> status / focused inspection
same diagnosed cause twice        -> BLOCKED unless new decision-changing evidence exists
```

`status`, search, describe, hierarchy detail, bounds, texture diagnostics, captures, and animation inspection are **decision tools**, not progress rituals.

## Geometry

### New Reference-Driven Model

Minimum logical sequence:

```text
status/bootstrap only when orientation is unknown
-> reference evidence contract in reasoning
-> create_project only when no target project exists
-> required Groups/Bones in coherent calls
-> manage_cubes coherent primary batch(es)
-> capture_model_views Core View Triad
-> inspect_model_bounds only for diagnosed contact/surface/envelope question
-> one causal correction if needed
-> recapture affected view(s) only
-> UV readiness preflight
```

Avoid:
- per-Cube `inspect_elements` before known coherent construction;
- screenshot after every mutation;
- `get_project_info` immediately after a successful `create_project` when the receipt already provides identity;
- bounds calls used as generic visual confirmation;
- search/describe for known `manage_cubes`, `add_group`, or capture calls.

### Geometry Correction

```text
fresh affected state/evidence
-> diagnose first wrong cause
-> inspect_elements(detail) only when exact current target state is genuinely missing
-> one coherent correction
-> use geometry_effect / mutation receipt
-> recapture affected view(s)
-> expand evidence only for a concrete cross-view regression risk
```

### Existing-Model Edit

```text
known target UUID/state -> mutate directly
unknown target identity -> one focused inspect_elements(search/outline/detail)
-> mutate affected cohort
-> verify only affected visual relation when required
```

Do not reread unaffected hierarchy or full model state.

## Texturing

### New Texture Pass

```text
list_textures(diagnostics=false) once for atlas discovery
-> diagnostics=true only when UV/coverage readiness is actually unknown
-> create/activate target texture only when required
-> one identity-critical representative patch/cohort
-> mapped model capture for reference judgement
-> propagate coherent texture cohort
-> one bounded verification bundle
```

Use `get_texture` only when pixel/atlas content is needed for the next decision. Do not alternate `get_texture` and mapped captures after every paint mutation.

### Texture Correction

```text
fresh atlas UUID + mapped evidence
-> identify one texture-owned cause
-> one coherent paint transaction/patch
-> refresh only affected mapped surface or atlas evidence
-> IMPROVED | UNCHANGED | REGRESSED
```

A Geometry/UV-owned defect exits Texturing instead of triggering extra paint calls.

### Existing-Model Texture Edit

Known atlas and mapped target -> direct paint operation. Inspect face mapping only when the requested region cannot be located reliably from fresh state.

## Animation

### New Animation

```text
switch_authoring_phase only at AUTHORING->ANIMATION boundary
-> create_animation
-> reuse returned animation UUID
-> author smallest judgeable keyframe cohort
-> capture representative reference times in one batch (views x times <= 8)
-> inspect_animation only when state not already known from receipts or existing clip discovery
-> one causal correction
-> recapture affected time/view or replay affected loop segment
```

Do not `set_time` repeatedly for snapshot collection; batch representative times.

### Animation Correction

```text
fresh animation UUID + timeline/playback evidence
-> diagnose first wrong motion/rig cause
-> one coherent bone/channel mutation
-> refresh affected pose/time or loop segment
-> IMPROVED | UNCHANGED | REGRESSED
```

If hierarchy/pivot/contact Geometry is the cause, hand off immediately. Do not spend calls adding denser keys or stronger easing as compensation.

### Existing Animation Edit

Known animation UUID and known target cohort -> mutate directly. `inspect_animation` is for unknown/stale clip state, not mandatory before every edit.

## Measurable Efficiency Scorecard

`bun run measure:mcp-efficiency` measures representative hot paths with one canonical scorecard:

```text
baseline_calls
optimized_calls
saved_calls
call_reduction_percent
baseline_payload_bytes
optimized_payload_bytes
payload_reduction_percent
baseline_mutation_calls
optimized_mutation_calls
baseline_inspection_calls
optimized_inspection_calls
baseline_verification_calls
optimized_verification_calls
quality_preserved
```

The scorecard is a deterministic architecture proxy, not live Codex token telemetry or native Blockbench latency. It is part of `verify:mcp` so an efficiency regression cannot silently land while ordinary behavior still passes.

Current measured patterns:

```text
coherent Cube cohort      -> manage_cubes batch
coherent keyframe cohort  -> manage_animation_timeline(batch)
exact atlas region work   -> paint_texture_transaction
complete mutation receipt -> no confirmation reread
unknown target identity   -> one bounded discovery + one focused read
```

### Cohort rule

Batch only when all operations share one semantic owner, the intermediate result does not change the next decision, and one rollback/Undo boundary is correct.

Keep separate calls when:

- the next mutation depends on visual/technical evidence from the previous one;
- operations cross Geometry/Texturing/Animation ownership;
- one failure must not roll back independent accepted work;
- target identity is unresolved;
- a native Blockbench API cannot represent the transaction safely.

A lower call count that removes required evidence is a regression, not an optimization.

### Opportunity register

The scorecard also reports candidates that are not yet implemented. `evidence_required` means do not widen a schema until real workflow frequency justifies it. `blocked_by_stable_api` means do not emulate private Blockbench internals.

## Call-Budget Interpretation

There is no universal fixed tool-call count because asset complexity differs. A call is justified only when at least one applies:

1. it establishes missing identity/state needed for a safe mutation;
2. it performs the intended mutation;
3. it provides decision-changing visual/technical evidence;
4. it resolves stale/lost project/runtime context;
5. it executes a required phase handoff or deliverable action.

Anything else is a candidate redundant call.

## Evaluation Record

For benchmark/development comparisons record separately:

```text
status_calls
search_calls
describe_calls
identity_inspections
bounds_calls
texture_diagnostic_calls
animation_inspections
visual_capture_batches
mutation_calls
correction_rounds
redundant_readbacks
total_calls_to_accepted_result
```

Fewer calls are an improvement only when acceptance quality is equivalent or better.
