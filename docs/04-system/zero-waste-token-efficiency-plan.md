# Zero-Waste Token Efficiency — Remaining Implementation Plan

Updated: 2026-09-20  
Scope: `Local` branch, Codex/Astra usage reduction without capability or quality loss.

## Goal

Reduce **total model usage per successful accepted task** while preserving or improving:

- task success;
- reference fidelity;
- Bedrock validity;
- visual correctness;
- user correction count;
- recovery safety.

Remote/source work may use serialized UTF-8 bytes and call counts only as deterministic regression proxies. **Actual token claims require source-provided Codex/Astra telemetry.**

## Deep Audit Closure — Source Layer

Status: **REMOTE_GITHUB SOURCE HARDENING COMPLETE** on the current implementation line. This is not a claim of measured Codex/Astra token savings.

The deep efficiency audit now covers four separate cost layers:

```text
STATIC / CACHEABLE CANDIDATE
→ root + MCP repository instructions
→ stable four-tool Gateway instructions/schemas
→ cross-stage common-prefix fingerprint
→ one stage-stable specialist extension

DYNAMIC TASK CONTEXT
→ whole Control-envelope Headroom
→ REQUIRED reference/user/readiness evidence protected
→ bounded useful context
→ explicit continuation reserve
→ superseded specialist/profile identities invalidated

TOOL / CONTINUATION OBSERVATIONS
→ successful read-only operations omit redundant Control deltas
→ audited read summaries compact duplicate prose
→ authoritative mutation receipts replace reassurance rereads
→ compaction-safe checkpoint preserves active context identities,
   uncertainty and decision-changing verification scope

SYSTEM DEVELOPMENT
→ exact source-owner routing first
→ bounded TypeScript symbol map only for ambiguous/cross-owner work
→ model-facing development projection removes echoed intent/static policy
```

Canonical regression/proxy owners:

```text
measure:model-context
measure:control
measure:continuation
benchmark:zero-waste-total
benchmark:zero-waste-bottlenecks
verify:astra-usage-ready
eval:astra-usage
```

Current deterministic total-context benchmark keeps static-prefix, dynamic-workflow and checkpoint bytes separate; they must never be summed and called tokens. The source gate requires quality preservation, fewer workflow calls/payload, valid continuation reserve, a smaller checkpoint, non-empty static-prefix candidates, and no remote token claim.

Read-only continuation suppression is annotation-owned rather than a capability-name delta allowlist. Read-summary prose compaction remains intentionally audited; image evidence and incomplete structured results are not compacted.

Prompt-cache support is structural only: one cross-stage common prefix candidate is measured separately from one stage-stable specialist extension and the dynamic tail. LazyDesigner cannot force an upstream cache hit. Actual cache reuse requires source-provided client/provider telemetry.

Conversation compaction is also client-owned. LazyDesigner exposes deterministic checkpoint data but does not delete chat history, run blind last-N pruning, or create a persistent observation database. An upstream compaction owner may treat a context ID as already-known only when the corresponding context content survives compaction; otherwise omit that ID so Control re-delivers current context.

No further source trimming is authorized merely from byte counts. Continue source optimization only when live telemetry identifies a material decision-safe bottleneck and quality/correction count does not regress.

## Existing Coverage — Do Not Rebuild

Already implemented:

- fixed four-tool Gateway;
- deferred discovery/describe;
- branch-specific schema projection;
- content-addressed context handles + `known_context_ids`;
- stage-specific Control projection;
- one active specialist + exactly one Geometry profile;
- compact status/search/describe/result projections;
- compact `control_delta`;
- change-scoped invalidation/freshness;
- receipt-only continuation;
- no confirmation reread when receipt is authoritative;
- progressive inspect;
- read-only inspect continuation compaction;
- workflow-level Zero-Waste benchmark;
- bottleneck ranking;
- permanent CI regression gate;
- live Golden A-F manifest;
- normalized Astra usage validator + readiness preflight.

Do not add duplicate planners, routers, memory stores, summarizers, or schema systems.

---

## Remaining Work

### P1 — Deterministic Context Headroom Guard

**Status:** IMPLEMENTED on `Local`; exact-SHA MCP Verify PASS.  
**Priority:** closed unless live telemetry exposes a defect.

### Problem

Control already projects active-stage context, but there is no explicit upper budget that prevents a future Reference Package / workspace / unknown list from gradually inflating the model-facing stage context.

### Design

Add one deterministic projection step at the **Gateway-facing Control boundary**. It must not alter canonical Reference Package or Workspace data.

Suggested owner:

```text
mcp/gateway/control/contextHeadroom.ts
```

Integrated only from:

```text
mcp/gateway/control/packet.ts
→ projectControlPacketForGateway(...)
```

Budget unit for REMOTE_GITHUB: **serialized UTF-8 bytes**, never called tokens.

Context classes:

```text
REQUIRED
- current user delta
- stage readiness
- blocking unknowns
- user/reference requirements that affect current stage
- selected profile
- current reference identity
- workspace stage/gate facts needed for current decision

USEFUL
- relevant non-blocking unknowns
- current-stage reference document pointer/summary fields
- relevant image IDs
- next step

OPTIONAL
- non-current-stage metadata
- repeated/derivable labels
- information already represented by an active content-addressed handle
```

Rules:

1. REQUIRED is never dropped to meet a budget.
2. OPTIONAL is dropped first.
3. USEFUL is bounded deterministically.
4. If REQUIRED alone exceeds the configured proxy budget, return:
   `headroom_state = REQUIRED_OVER_BUDGET`
   and preserve REQUIRED evidence rather than truncating it.
5. No AI summarizer/compressor.
6. No token estimator pretending to be Astra accounting.
7. No hidden mutation of Reference Package/workspace source.

### Initial budget behavior

Use a conservative byte guard derived from current measured stage-context distributions, not a guessed token target.

Expose internal measurement:

```text
before_bytes
after_bytes
required_bytes
optional_dropped_count
headroom_state
```

Do **not** expose these diagnostics to the model in normal status unless needed for a failure/debug path.

### Acceptance

- semantic REQUIRED fixtures are byte-for-byte preserved;
- optional removal reduces projected size;
- BLOCKED/reference-conflict context cannot be truncated;
- current user requirement cannot disappear;
- canonical `context_hash` remains conservative source identity; Headroom owns a separate internal `projection_hash` for deterministic projection diagnostics;
- no extra Gateway call;
- no extra model inference;
- workflow quality gates unchanged.

### Benchmark

Add a fixture with deliberately large non-blocking/reference metadata and verify:

```text
projected bytes ↓
REQUIRED evidence = identical
tool calls = unchanged
quality contract = unchanged
```

---

### P2 — Superseded Evidence Non-Repetition

**Status:** IMPLEMENTED on `Local`; exact-SHA MCP Verify PASS.  
**Priority:** closed unless live telemetry exposes a repeated-context defect.

### Important boundary

LazyDesigner cannot safely delete arbitrary prior Codex chat/history from the Gateway. Therefore do **not** build a fake history-pruning engine.

The useful implementation is narrower:

> once newer authoritative state exists, LazyDesigner must not **re-send** older server-owned evidence in later Control/status/continuation payloads.

### Design

Extend existing projection semantics, not persistent state.

Owners:

```text
mcp/gateway/control/packet.ts
mcp/gateway/control/delta.ts
mcp/gateway/control/contextProjection.ts
```

Rules:

- content-addressed handle family: newest current handle only;
- invalidated same-family IDs remain one-shot invalidation evidence;
- successful authoritative mutation receipt owns current affected state;
- later status must not resend a stale predecessor merely for reassurance;
- current conflicting evidence is **not** superseded;
- failure / UNKNOWN_OUTCOME evidence is **not** evicted;
- approved reference/user requirements are never superseded by authored state;
- before/after evidence needed by an active visual comparison remains available until that verification decision closes.

Do not add a persistent observation database.

### Acceptance

Regression fixtures:

1. fresh receipt replaces stale authored-state continuation;
2. failed mutation retains uncertainty;
3. conflicting reference facts survive;
4. visual before/after survives until verification;
5. repeated status with known handles does not resend the prior context family.

### Expected value

Mostly prevents future re-expansion. Do not claim large savings until Astra telemetry shows repeated-history cost actually falls.

---

### P3 — Context Budget Telemetry / Headroom Diagnostics

**Status:** IMPLEMENTED with P1 in `measure-control-context.ts` + Headroom diagnostics.  
**Priority:** closed; diagnostics stay off the normal model-facing path.

Purpose: make headroom measurable without putting diagnostics into normal model context.

Add deterministic measurement to the existing benchmark/reporting path:

```text
stage_context_before_bytes
stage_context_after_bytes
required_bytes
useful_bytes
optional_bytes
dropped_optional_fields
required_over_budget
```

Owner:

```text
mcp/scripts/measure-control-context.ts
or existing Zero-Waste measurement harness
```

No background service, no logging database, no new runtime endpoint.

---

### P4 — Live Astra Feedback Gate

**Status:** preparation implemented; live measurement pending.  
**Priority:** mandatory before any further large source optimization.

Existing owners:

```text
mcp/tests/fixtures/astra-live-golden-tasks.json
mcp/tests/fixtures/astra-usage-validation-template.json
mcp/scripts/validate-astra-usage.ts
mcp/scripts/verify-astra-usage-ready.ts
```

Execution:

```text
verify:astra-usage-ready
→ run comparable baseline + zero_waste Golden Task
→ quality PASS on both
→ capture source-provided telemetry
→ eval:astra-usage
```

Decision rule:

KEEP an optimization only when:

```text
quality >= baseline
task success >= baseline
user corrections <= baseline
total usage improves materially OR call/context reduction is proven useful
```

REJECT/revert when usage improves but quality/corrections regress.

No aggregate quality score.

---

## Conditional Work — Only If Live Telemetry Justifies It

### C1 — Further Search Payload Slimming

Current search projection is already compact and safety-preserving.

Only revisit if live telemetry shows discovery is a meaningful residual cost. Potential safe targets are repeated descriptive prose or fields already known from the selected capability.

Do not remove:

- capability identity;
- authoring domain when needed;
- safety semantics;
- ranking/discovery signal needed to select the correct capability.

### C2 — Further Inspect Payload Slimming

Current inspect output already removed redundant NO_CHANGE continuation/prose.

Do **not** delete authored geometry/hierarchy fields based on byte count alone.

Only add more detail modes if live tasks show a repeated pattern where a smaller view can answer the decision with identical correction count and success.

Preferred order:

```text
existing focused geometry detail
→ optional even-narrower identity/transform view only if evidence proves it useful
→ full detail remains available
```

No default quality reduction.

### C3 — Stable Prefix / Dynamic Tail Tuning

Already substantially present through compact Gateway instructions, content-addressed handles and stage-specific projection.

Only tune if actual telemetry shows repeated stable-prefix cost is not being cached or reused effectively by the client.

No new prompt manager.

---

## Explicitly Rejected Unless Future Evidence Changes

Do not implement now:

- AI context summarizer;
- AI planner/router layer;
- LLMLingua or lossy natural-language compression on authoritative state;
- vector DB for Blockbench authored state;
- graph DB for current project state;
- persistent observation/history database;
- predictive prefetch;
- background AI;
- second semantic memory system;
- duplicate Repo Map for authored Blockbench state;
- arbitrary chat-history deletion/pruning controlled by Gateway;
- extra public Gateway tools;
- capability/schema reduction for context savings.

Reason: overhead/risk is currently larger than proven usage savings.

---

## Implementation Order

### Phase 1 — Headroom Guard — COMPLETE

Files:

```text
NEW  mcp/gateway/control/contextHeadroom.ts
EDIT mcp/gateway/control/contextProjection.ts
EDIT mcp/gateway/control/packet.ts
EDIT mcp/gateway/control/index.ts
NEW/EDIT focused Control tests
EDIT Zero-Waste measurement fixture
```

One logical commit.

Gate:

```text
typecheck
Runtime tests
authoring contracts
Zero-Waste workflow regression
bottleneck report
Repository Verify
Head Proof
```

### Phase 2 — Superseded Non-Repetition — COMPLETE

Proceed only after Phase 1 exact-SHA gates pass.

Files should remain limited to existing Control projection/delta owners + focused tests.

No persistent storage.

### Phase 3 — Local/Live Astra Measurement — NEXT

No further source trimming before running Golden A-F.

Use:

```bash
bun run verify:astra-usage-ready
bun run eval:astra-usage -- <captured-file>
```

### Phase 4 — Evidence-Driven Follow-up

Only optimize the largest **decision-safe** live usage source.

If live telemetry does not reveal a material source-layer bottleneck, STOP.

---

## Stop Conditions

Source-layer Zero-Waste work is complete when:

1. deterministic headroom guard exists;
2. superseded server-owned evidence is not re-sent unnecessarily;
3. all exact-SHA remote gates pass;
4. live usage harness is ready;
5. remaining candidate savings require either quality-risky field removal or unverified assumptions.

At that point the only legitimate next step is measured Codex/Astra + LIVE_BLOCKBENCH validation.
