# LazyDesigner Next Action

Updated: 2026-09-18  
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/flow.md`; source/context ownership in `docs/04-system/`; proof interpretation in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former `mcp/gateway/navigator/` source is removed with no alias; `Experimental/blockit-navigator/` is historical documentation only.

## Current State

The current REMOTE_GITHUB architecture-hardening scope is in its final synchronization pass before LOCAL_CODE.

```text
Control                 SOURCE-HARDENED
Gateway                 SOURCE-HARDENED
Runtime                 SOURCE-HARDENED
Plugin                  SOURCE-HARDENED
Tools                   ZERO-LOSS GUARDED
Validation / QA / Gates SOURCE-HARDENED
Skills / Knowledge      CONTEXT-HARDENED
Reference flow          AUDITED
Repository contracts    SYNCHRONIZATION IN PROGRESS
```

Current invariants:

- Gateway exposes only `status`, `search_capabilities`, `describe_capability`, and `invoke_capability`.
- Gateway is the persistent AI-client boundary. Runtime/plugin/Blockbench recovery happens beneath it; a new client connection is required only when the Gateway process itself is replaced.
- Runtime owns capability registration, authoring surface resolution, execution serialization, project/phase affinity enforcement, and Runtime result contracts.
- Plugin owns Blockbench host integration: native network/listener lifecycle, UI/settings/resources, and development reload behavior.
- Tool consolidation is routing-only. Original executors, schemas, validation, native behavior, and domain intelligence remain retained.
- Internal diagnostics and Blockbench Validator state are evidence only; they never create visual PASS or user approval.
- AUTHORING↔Animation handoff requires canonical readiness plus a saved checkpoint. Control lifecycle `READY` is not handoff authorization.
- Geometry↔Texturing remain one shared AUTHORING surface; semantic focus may change without creating a second tool family or workflow engine.
- `switch_authoring_phase` applies the registered Runtime phase/surface handler before returning its Gateway receipt.
- Normal authoring loads one active specialist; the shared stage contract is conditional policy context rather than a second routine payload.
- Control projects one compact active-stage envelope and references stage evidence instead of duplicating full semantic documents.
- Public consolidated capability development routes to the actual Runtime public owner, not the compatibility `server/tools.ts` facade.
- No second router, capability registry, persistent state database, authoring workflow engine, or alternate tool implementation path is allowed without a proved requirement.

## Next Meaningful Context

### REMOTE_GITHUB — current final synchronization

Finish the exact-head synchronization gate:

```text
remove remaining retired-source closure
→ regenerate canonical prompt/API outputs
→ align stale regression contracts with current ownership
→ bun run verify:full
→ accept only exact-head PASS
```

No hand-editing generated docs/output. Generated prompt/API artifacts remain generator-owned.

Do not remotely force:

- Tool algorithm simplification;
- public Gateway status contract changes based only on static size;
- Runtime transport rewrites without matching tests;
- capability removal for context savings;
- compatibility identifier migration.

### LOCAL_CODE — after synchronized REMOTE_GITHUB gate

Before new MCP capability work, perform one bounded protocol-modernization spike against the matching clean `Local` SHA:

```text
upgrade the MCP TypeScript SDK on a dependency/lockfile-owned local checkout
→ prove the official v2 HTTP handler can serve MCP 2026-07-28 plus legacy stateless clients
→ map current Host/Origin/body-limit/affinity/generation invariants onto that boundary
→ replace custom HTTP parsing only where equivalent behavior is proven
→ keep one Runtime endpoint and one Gateway; do not add a parallel transport stack
```

Acceptance for that spike is **deletion/simplification**, not feature count. Do not merge a modern-protocol adapter that leaves the existing raw parser as an equally authoritative permanent path.

The current source still targets the legacy 2025-era Streamable HTTP behavior through `@modelcontextprotocol/sdk` v1.x. Do not claim MCP 2026-07-28 support until the upgraded SDK path, wire behavior, compatibility tests and lockfile all pass from the same source SHA.

From the matching clean `Local` SHA:

```text
install pinned dependencies
→ run targeted authoring-flow / phase-control / Gateway tests only if additional local-only evidence is needed
→ typecheck/build confirmation when not already covered by exact-head CI evidence
→ measure Control/context and authoring-surface costs
→ fix only failures tied to current source
```

Specific phase-transport proof:

```text
Geometry → Texturing focus
→ Runtime handler applies target focus
→ AUTHORING tool set remains identical
→ verify whether Gateway connection/catalog can safely remain warm

AUTHORING → Animation
→ Runtime handler applies Animation surface
→ Gateway refreshes to Animation catalog

Animation → AUTHORING
→ Runtime handler restores shared AUTHORING surface
→ Gateway refreshes to AUTHORING catalog
```

Only after these tests should Gateway catalog invalidation be relaxed for Geometry↔Texturing. Do not optimize this by assumption.

Do not rerun broad verification between every edit.

### LIVE_BLOCKBENCH — after matching source/build proof

Prove the native boundaries that source/static work cannot establish:

```text
persistent Gateway survives Runtime/plugin reload
Runtime rebuild recovery
Blockbench close → open recovery
AUTHORING ↔ Animation catalog handoff
Geometry ↔ Texturing focus change preserves the shared surface
project affinity / rebind behavior
interrupted mutation → inspect-before-retry recovery
Geometry / Texturing / Animation / Particle execution
Undo / playback / persistence / export behavior
representative accepted-result quality + efficiency
```

Measure **Cost to Accepted Result** without lowering accepted quality.

## Stop Rules

- no second Control/router/profile/state system;
- no parallel permanent legacy/modern HTTP implementation; protocol modernization must converge on one transport owner;
- no new custom HTTP parser features when the supported MCP SDK can own the same protocol behavior;
- no capability/intelligence reduction for tool-count or context savings;
- no mutation auto-retry after an unknown outcome;
- no hand-edited generated API/prompt output;
- no all-profile/all-stage context loading as reassurance;
- no bulk rename of compatibility-bound BlockIT identifiers;
- no claim of Bun/typecheck/CI/local/live PASS until that proof actually ran.

## Proof Boundary

REMOTE_GITHUB can establish source architecture, generated freshness, typecheck/test/build contracts when exact-head CI executes them. The current source has **not been typechecked/executed locally** or proven live in Blockbench during this phase. Installed-runtime freshness, reload survival, native mutation behavior, visual fidelity, and measured usage savings remain higher-context proof work.
