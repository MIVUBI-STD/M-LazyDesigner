# LazyDesigner Next Action

Updated: 2026-09-21
Branch: `Local` only.

Owns current implementation continuation only. Stable product/system/proof owners remain `docs/01-product/`, `docs/04-system/`, and `docs/05-operations/current-validation.md`. Canonical Control is `mcp/gateway/control/`; no second Control/router/profile/state system.

## Current State

REMOTE_GITHUB is current source authority. Historical reusable baseline:

```text
generated freshness PASS
Runtime/Gateway typecheck PASS
Runtime regression PASS
authoring contracts PASS
modern MCP 2026 negotiation/list/call PASS
legacy 2025 JSON initialize/list/call PASS
```

Historical proof does not transfer to changed SHAs. Generated API/prompt output remains generator-owned.

Core invariants:

- Gateway public surface stays `status`, `search_capabilities`, `describe_capability`, `invoke_capability`.
- persistent Gateway survives Runtime/plugin reload; Runtime owns Blockbench execution.
- Desktop is workstation control, not a second editor/project database.
- mutation uncertainty is fail-closed; no unsafe auto-retry.
- no capability reduction solely for context savings.

## Active Development — Texture Compute + AI Efficiency

Deep audit owner:

```text
mcp/docs/TEXTURE_COMPUTE_AI_EFFICIENCY_AUDIT.md
```

Current implementation state:

```text
C1 ROI + dirty-scope propagation          SOURCE IMPLEMENTED
C2 pointwise pass fusion                  SOURCE IMPLEMENTED; HARDEN NEXT
C3 streaming Sobel/directional shading    SOURCE IMPLEMENTED
C4 adaptive color/palette caches          SOURCE IMPLEMENTED; VERIFY CURRENT SHA
C5 measured planner cost model            NEXT AFTER C2/C4 GATES
```

Do not add more texture filters. Do not add GPU/WASM/workers/persistent compute caches/search trees before C1–C4 are measured.

Immediate order:

1. make current C4 regression/source gate green;
2. harden C2 fused execution allocation/state reuse without changing output;
3. add C5 measured planner cost proxies and policy;
4. continue low-risk AI-context progressive disclosure only where evidence shows payload waste.

C2 acceptance:

- byte-equivalent to sequential execution;
- no per-unique-color transient typed-array churn when avoidable;
- generated/static operation state prepared once per fused group;
- fewer pixel passes and temporary allocations are reported as source metrics, not invented wall-clock claims.

C5 initial measured inputs:

```text
atlas pixels
ROI/compute pixels
requested/optimized/fused steps
pixel visits / pass count
palette comparisons
temporary-byte estimate
cache hit/miss/peak/admission
palette size
bounded unique-color estimate
```

Planner may choose only already-supported deterministic execution paths. No wall-clock superiority claim until LOCAL_CODE benchmark evidence exists.

Parallel AI-context work is limited to:

```text
generic continuation/result projection audit
branch-focused describe hotspots
provider/client telemetry preparation
```

Serialized bytes remain proxies, not actual provider token counts.

## Project/Desktop State — Do Not Redo

Already source-hardened unless new evidence reproduces a defect:

- persistent Recent is separated from Active/Open/Dirty;
- stale Plugin sessions cannot retain live Switch/Modified;
- navigation snapshot is generation/session/profile aware;
- stable project identity uses minimal `.lazydesigner-project.json`;
- Continue resolves one exact last-active saved `.bbmodel`;
- Desktop single-instance uses the Windows session-local owner;
- oversized Desktop owners were split where evidence justified it;
- Project Navigator has bounded repository behavioral coverage.

Current grouping fallback:

```text
nearest bounded .lazydesigner-project.json marker
→ parent of Models/Model
→ direct .bbmodel parent folder
```

Quick Command, thumbnails, crawler, tags, cloud DB, and arbitrary hierarchy remain out of scope.

## LOCAL_CODE / LIVE_BLOCKBENCH Residue

LOCAL_CODE owns only toolchain/filesystem/generator work that cannot be completed in REMOTE_GITHUB.

LIVE_BLOCKBENCH owns native/session/visual proof:

- real tab/Save/Save As navigation behavior;
- installed Runtime identity and recovery;
- Gateway reload survival and rebind;
- Undo/playback/persistence/export;
- native paint/texture lifecycle;
- visual fidelity and accepted-result quality.

Use `docs/05-operations/local-acceptance-runbook.md`. CI never proves native PASS.

## Blockbench 5.2

Native IK controller support remains source-integrated under `bone_rigging`. Live residue stays in `docs/05-operations/blockbench-5.2-native-adoption.md`.

## Stop Rules

- no second Control/router/profile/state system;
- no duplicate Desktop project database;
- no dependency graph/persistent revision DB without demonstrated need;
- no hybrid Gateway before Golden Task evidence;
- no capability reduction for context savings;
- no mutation auto-retry after unknown outcome;
- no hand-edited generated API/prompt output;
- no claim of Bun/typecheck/CI/local/live PASS until that proof actually ran.

## Proof Boundary

REMOTE_GITHUB proves source/static/CI contracts only on the exact SHA. LOCAL_CODE and LIVE_BLOCKBENCH claims require their corresponding evidence.

## Zero-Waste Usage — LIVE RESIDUE

Remote/source hardening remains bounded. Do not resume speculative payload trimming. Use `verify:astra-usage-ready`, Golden A–F, and `eval:astra-usage -- <file>`; only source-provided response/compaction telemetry plus quality PASS can prove actual Codex/Astra usage improvement.
