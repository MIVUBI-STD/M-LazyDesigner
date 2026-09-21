# Zero-Waste Authoring Execution

Status: SOURCE FOUNDATION
Updated: 2026-09-22
Branch: `Local`

## Goal

Reduce model work per accepted result by moving deterministic mechanics behind existing semantic owners.

```text
compact semantic intent
→ local desired-state compile
→ existing cross-domain impact plan
→ deterministic execution strategy
→ existing affected-only native owners
→ delta-driven verification
```

This does not add a public MCP capability, second planner service, persistent dependency database, scene database, AI router, or background process.

## Source owners

```text
lib/authoringIntent/contracts.ts
  compact bounded intent + preserve requests

lib/authoringIntent/desiredState.ts
  sequential semantic geometry operations
  compiled locally through authoringRecipe/semanticEdit

lib/orchestration/executionStrategy.ts
  deterministic DIRECT / BATCH / RECIPE / PROCEDURAL choice

lib/orchestration/deltaVerification.ts
  risk projection over the existing minimal verification planner
```

Existing owners remain authoritative:

```text
authoringRecipe/semanticEdit.ts     semantic geometry mechanics
orchestration/authoringImpact.ts   cross-domain affected scope
orchestration/verificationPlan.ts  required verification tasks
native domain adapters             mutation execution
```

## Zero-Waste rules

1. AI states meaning and durable constraints; deterministic coordinate/math work stays local.
2. Existing recipe ownership wins over explicit native-coordinate mutation.
3. Oversized structured texture work escalates representation instead of emitting large exact-pixel payloads.
4. Verification budgets are advisory only. Required checks are never truncated to save context.
5. Preserve requests are carried as requirements and remain `DEFER_TO_DOMAIN_OWNERS` until the owning UV/Rig/Texture/Animation layer proves them.
6. Unknown or ambiguous ownership remains fail-closed.
7. No token-savings claim is valid without client/provider usage telemetry.

## Current strategy policy

```text
structured texture > exact-coordinate budget → PROCEDURAL
recipe-owned geometry change              → RECIPE
large repeated structure                  → RECIPE
small unowned edit                         → DIRECT
remaining bounded mutation                 → BATCH
```

Thresholds are deterministic implementation policy, not model reasoning. They may be tuned only after local benchmarks show a better accepted-result cost.

## Proof boundary

REMOTE_GITHUB can prove contracts, deterministic selection, bounded payload policy, and test coverage.

LOCAL_CODE must prove typecheck/tests and benchmark wall-clock/allocation behavior.

LIVE_BLOCKBENCH must prove Undo/Redo, save/reopen, viewport responsiveness, native fidelity and correction-round behavior.

Provider/client telemetry is required before claiming real usage savings.

## Compact evidence handles

Zero-waste recipe execution now keeps verbose native evidence in one bounded in-memory registry:

```text
semantic/native identity resolution
→ authoringevidence:<sha256>
→ compact model-facing identity summary

full incremental apply receipt
→ authoringevidence:<sha256>
→ compact model-facing mutation summary
```

The compact identity projection deliberately omits native UUIDs. It carries semantic instance IDs and counts only; UUID detail remains retrievable through the evidence handle when recovery/debugging genuinely requires it.

The compact apply projection retains only decision-relevant mutation information:

```text
execution
recipe_id
affected counts
bounded created/updated/removed examples
metadata-only examples
preserved count
invalidation scope
post-apply native fingerprint
evidence handle
```

The existing full `apply()` and full identity resolver remain intact for compatibility. Zero-waste consumers may use `applyCompact()` / `resolveIdentityCompact()` instead. Evidence handles are Runtime-generation-local, bounded and non-persistent; they are not a second history database.

## Verification evidence compaction

Delta verification now compiles required domain checks into the smallest existing evidence surface instead of requesting broad re-inspection.

```text
GEOMETRY LOW    → capture_model_views front @ 256
GEOMETRY MEDIUM → front + left @ 256
GEOMETRY HIGH   → front + left + front_left_3q @ 512
TEXTURE affected surfaces → get_texture region evidence
TEXTURE semantic review   → full-atlas evidence
UV                       → existing UV layout evidence
RIG                      → focused element inspection
ANIMATION                → focused animation inspection
```

These are deterministic request projections over existing capabilities, not new public tools.

Full evidence may be retained behind a bounded Runtime-local:

```text
verificationevidence:<sha256>
```

Model-facing verification output is limited to state, domain/source, discrepancy count and at most six discrepancy summaries. Raw image/inspection payload remains local unless the actual visual judgement requires image delivery. A verification budget never removes a required domain check.
