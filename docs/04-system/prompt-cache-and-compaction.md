# Prompt Cache & Long-Context Contract

Updated: 2026-09-20

This contract defines LazyDesigner-owned behavior that supports prompt-cache reuse and safe long-running conversation compaction. It does **not** claim that LazyDesigner owns the Codex/OpenAI conversation API or can force a cache hit.

## Objective

Minimize total model usage per accepted task by keeping reusable context stable and moving volatile task state into a bounded dynamic tail.

```text
STABLE PREFIX CANDIDATE
→ repository instructions that truly apply
→ stable Gateway instructions
→ four stable Gateway tool definitions
→ one active specialist for the current semantic stage

DYNAMIC TAIL
→ user/task delta
→ Control stage projection
→ reference images/evidence selected for the decision
→ current tool results / recovery state
→ current visual evidence
```

Static-prefix bytes are a regression proxy, not model tokens. Actual reuse is proven only by provider/client telemetry such as cached-input accounting or cache diagnostics when available.

## Stable Prefix Rules

1. Keep Gateway tool names, ordering, descriptions and schemas stable when semantics did not change.
2. Keep stable instructions byte-identical when no behavior changed; do not inject UUIDs, revisions, timestamps, task IDs or current status into stable instruction text.
3. Content-addressed specialist/profile handles preserve identity; unchanged handles are reused rather than resent.
4. Do not move volatile state into AGENTS, Skills, Gateway descriptions, or static tool schemas.
5. A stable but unnecessarily large prefix is still waste. Instruction footprint is measured by `measure:model-context`; quality-sensitive slimming requires regression proof.

Canonical static-footprint utility:

```bash
bun run measure:model-context
```

It reports repo-owned candidate prefix bytes and fingerprints separately for system development and each authoring specialist. Fingerprints detect source churn only; they do not prove upstream prompt assembly or cache hits.

## Dynamic Tail Rules

Dynamic context contains only state that can change the current decision.

- Headroom applies at the whole Gateway Control-envelope boundary, not just one field.
- REQUIRED stage evidence is preserved even if it exceeds the byte proxy budget.
- Stage-approved `reference_image_ids`, blocking unknowns, user delta, requirements, readiness and workspace gates are REQUIRED.
- Non-blocking unknowns, stage document pointer and workspace next step are bounded useful context.
- A continuation reserve is held back for later tool/result state.
- Byte limits are regression proxies and never advertised as model context-window/token limits.

## Tool Observation Economy

- Successful state-preserving reads use canonical read-only annotations and do not receive redundant `NO_CHANGE control_delta`.
- Authoritative mutation receipts replace reassurance rereads.
- Superseded specialist/profile handle families are explicitly invalidated.
- UNKNOWN_OUTCOME, conflicting evidence and decision-changing visual verification state are never evicted for compactness.
- Structured results remain authoritative; duplicate prose is compacted only where structured receipt is sufficient.

## Conversation Compaction Boundary

LazyDesigner does not own arbitrary Codex/chat history and must not implement blind last-N/history deletion.

Instead it provides a deterministic compaction-safe checkpoint:

```text
mcp/gateway/control/continuationCheckpoint.ts
```

The checkpoint retains task/project identity and binding, active domain/next intent, current user delta and REQUIRED stage evidence, readiness/blockers, current required/invalidated context IDs, freshness uncertainty, and verification scope when still decision-changing. It intentionally omits complete fresh-scope complements, source-owner prose and historical observations no longer required for continuation.

Measurement:

```bash
bun run measure:continuation
```

An upstream client that actually owns conversation state may use its native compaction mechanism at meaningful milestones. LazyDesigner Gateway/Runtime does not call a provider conversation API.

## Compaction Cost Accounting

Compaction is not free. End-to-end task usage must include every source-reported model event.

```text
model_events:
- kind: response | compaction
- total_tokens
- input_tokens
- cached_input_tokens
- output_tokens
- reasoning_tokens
- cache_missed_tokens (when exposed)
- comparison_reusable_tokens (when exposed)
```

If any required event lacks source-provided `total_tokens`, token comparison remains unavailable rather than being reconstructed from components.

Use:

```bash
bun run eval:astra-usage -- <normalized-usage.json>
```

Quality PASS and successful completion are required before token savings can be claimed.

## Development Context

SYSTEM_DEVELOPMENT begins with exact source owners. Do not load a repo map on every task.

When routing is ambiguous/cross-owner and broad reads would otherwise be required:

```bash
bun run map:development -- "<intent>"
```

The map is bounded and contains only source paths, imports and top-level signatures. It never includes implementation bodies and is not used by asset-authoring Runtime.

## Measurement Layers

Keep these measures separate:

```text
STATIC PREFIX PROXY
→ AGENTS / specialist / Gateway instructions / four tool schemas

DYNAMIC WORKFLOW PROXY
→ Gateway/Control/tool-result bytes + call trajectory

CONTINUATION PROXY
→ full internal state vs compact continuation checkpoint

ACTUAL USAGE
→ source-provided response + compaction token telemetry

QUALITY
→ task success + reference/technical/visual acceptance + user corrections
```

Never sum static-prefix bytes and dynamic bytes and label the result “tokens”; prompt caching and history reuse make that invalid.

Canonical combined proxy report:

```bash
bun run benchmark:zero-waste-total
```

## Stop Rule

Do not add AI summarizers, AI planners, vector stores, persistent observation databases, lossy compression of authoritative state, or predictive prefetch merely to reduce context.

After these contracts pass source gates, further context trimming is allowed only when real usage telemetry identifies a material decision-safe bottleneck and quality/correction count does not regress.
