# LazyDesigner Next Action

Updated: 2026-09-19  
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/flow.md`; source/context ownership in `docs/04-system/`; proof interpretation in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former `mcp/gateway/navigator/` source is removed with no alias; `Experimental/blockit-navigator/` is historical documentation only.

## Current State

The current REMOTE_GITHUB architecture-hardening and MCP protocol-modernization scope has exact-head verification.

```text
Control                 SOURCE-HARDENED
Gateway                 SOURCE-HARDENED
Runtime                 SOURCE-HARDENED
Plugin                  SOURCE-HARDENED
Tools                   ZERO-LOSS GUARDED
Validation / QA / Gates SOURCE-HARDENED
Skills / Knowledge      CONTEXT-HARDENED
Reference flow          AUDITED
Repository contracts    SOURCE-HARDENED
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
- Post-operation Control receipts distinguish stale, fresh, and unknown semantic scopes so unrelated state can be reused without blanket rereads; authoring-domain invalidation remains a compatibility summary.
- Public consolidated capability development routes to the actual Runtime public owner, not the compatibility `server/tools.ts` facade.
- No second router, capability registry, persistent state database, authoring workflow engine, or alternate tool implementation path is allowed without a proved requirement.

## Next Meaningful Context

### REMOTE_GITHUB — current closed source gate

Exact-head source verification is now the baseline, not pending work:

```text
generated freshness PASS
Runtime/Gateway typecheck PASS
Runtime regression PASS
authoring contracts PASS
surface/phase measurement PASS
compatibility build + exact-SHA artifact PASS
modern MCP 2026 negotiation/list/call PASS
legacy 2025 JSON initialize/list/call PASS
```

No hand-editing generated docs/output. Generated prompt/API artifacts remain generator-owned.

Do not remotely force:

- Tool algorithm simplification;
- public Gateway status contract changes based only on static size;
- a third Runtime transport path;
- capability removal for context savings;
- compatibility identifier migration.

### REMOTE_GITHUB — current high-end continuation

The next source optimization is now bounded to **freshness precision**, not another routing/state framework:

```text
universal semantic freshness receipt → IMPLEMENTED IN SOURCE
Texture / Material invalidation split  → IMPLEMENTED IN SOURCE
Animation motion/controller/effects   → IMPLEMENTED IN SOURCE
Particle freshness isolation          → IMPLEMENTED IN SOURCE
failed mutation freshness             → FAIL-CLOSED AS UNKNOWN
```

Keep the existing four-tool Gateway unchanged. Do not introduce direct hot-path tools or a hybrid surface until Golden Tasks provide matching live Cost-to-Accepted-Result evidence.

Remaining source-side refinement is evidence-driven only: if individual Runtime receipts expose narrower changed fields than the current capability-level semantics, enrich the existing effect receipt rather than creating a dependency graph/state engine.

### LOCAL_CODE — after synchronized REMOTE_GITHUB gate

MCP v2 protocol modernization is now source-proven on the same Runtime endpoint:

```text
2026-07-28 modern negotiation/list/call PASS
+
legacy 2025 initialize/list/call PASS
+
Runtime/Gateway typecheck + regression/build PASS
```

Transport ownership reduction remains a separate lower-priority local task, not the current high-end authoring optimization:

```text
audit whether Node/SDK HTTP serving can replace the raw TCP/HTTP parser
→ preserve loopback Host/Origin/body-limit checks
→ preserve project/phase affinity and serialized mutation
→ preserve generation-safe shutdown
→ preserve modern + legacy compatibility proofs
→ delete parser code only when equivalent behavior is demonstrated
```

Do not add a third transport path. Gateway traffic now prefers MCP 2026 through `versionNegotiation.mode="auto"`. The temporary legacy JSON leg remains only for supported 2025-era compatibility because server v2.0.0 currently emits SSE from its built-in legacy stateless fallback even when the modern handler is configured with `responseMode="json"`. Remove this shim only after the SDK closes that behavior gap or the legacy JSON contract is deliberately retired.

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

REMOTE_GITHUB can establish source architecture, generated freshness, typecheck/test/build contracts when exact-head CI executes them. The current source has exact-head REMOTE_GITHUB typecheck/test/build proof but has **not** been proven live in Blockbench during this phase. Installed-runtime freshness, reload survival, native mutation behavior, visual fidelity, and measured usage savings remain higher-context proof work.
