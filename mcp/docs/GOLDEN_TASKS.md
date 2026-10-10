# LazyDesigner Golden Task Benchmark

This file defines the future live benchmark contract for **Cost to Accepted Result**. It does not add a Runtime tool, planner, quality scorer, or automated acceptance authority.

Canonical machine-readable tasks live in `tests/fixtures/golden-task-cases.json`. Real regression incidents live separately in `tests/fixtures/regression-cases.json`.

## Rule

Every checked-in Golden Task remains `UNMEASURED` until the task is executed against a matching LazyDesigner source/build with:

- approved reference evidence and explicit requirements;
- Blockbench/runtime environment provenance;
- captured Geometry/Texturing/Animation evidence as applicable;
- correction history;
- tool-call observations;
- human acceptance state.

Static tests may validate the benchmark **shape**, but they cannot convert an unmeasured task into PASS.

## Accepted-result proof guard

The existing evaluator accepts quality as measured only with
`LIVE_BLOCKBENCH` scope, a contiguous task/SHA-specific Gateway trace,
at least one **recorded successful** mutation and verification, unique PASS
evidence for every required task criterion, and a separate documented
`human_acceptance` review reference. Failed attempts may stay in the trace.
Approval must come from a real human review; an LLM, tool receipt or passing
static validator cannot attest it.

The existing Gateway recorder already emits operation success flags. The
session draft preserves those flags and adds an **UNVERIFIED** human-review
criterion. No extra authoring tools, screenshots or routine Codex context are
introduced.

## Required Run Record

A future live run should record at minimum:

    task_id
    source_sha
    runtime_build_identity
    blockbench_version
    operating_system
    reference_revision
    artifact_revision
    phase verdicts
    critical defects
    status_calls
    search_calls
    describe_calls
    identity inspections
    visual capture batches
    mutation calls
    correction rounds
    redundant readbacks
    runtime/tool errors
    total calls to accepted result
    accepted | not accepted

Do not compute a single aggregate quality score. Critical failures remain explicit categorical defects and cannot be averaged away.

## Comparison Rule

Compare implementation revisions only when task inputs and acceptance criteria are materially equivalent.

An improvement means equal-or-better accepted quality with lower or equal **Cost to Accepted Result**, or a clearly documented quality gain that justifies additional cost.

## Corpus Intent

The initial eight tasks cover rigid prop/furniture, mechanical geometry + animation, humanoid rig/attachment/motion, organic curved construction, layered/alpha-cutout representation, PBR material authoring, particle + locator + animation integration, and targeted correction of an existing model.

Do not expand the corpus merely to increase case count. Add a task only when it represents a materially different authoring failure mode or production workload.
