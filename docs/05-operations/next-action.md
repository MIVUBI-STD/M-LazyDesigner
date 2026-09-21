# LazyDesigner Next Action

Updated: 2026-09-21
Branch: `Local` only.

Owns current implementation continuation only. Stable product/system/proof owners remain `docs/01-product/`, `docs/04-system/`, and `docs/05-operations/current-validation.md`. Canonical Control is `mcp/gateway/control/`; former `mcp/gateway/navigator/` source is removed with no alias; no second Control/router/profile/state system.

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

Historical proof does not transfer to changed SHAs. No hand-editing generated docs/output; generated API/prompt output remains generator-owned.

Core invariants:

- Gateway public surface stays `status`, `search_capabilities`, `describe_capability`, `invoke_capability`.
- persistent Gateway survives Runtime/plugin reload; Runtime owns Blockbench execution.
- Desktop is workstation control, not a second editor/project database.
- mutation uncertainty is fail-closed; no unsafe auto-retry.
- no capability reduction solely for context savings.

## Active Development — Parametric Authoring Engine

Architecture owner:

```text
mcp/docs/PARAMETRIC_AUTHORING_ENGINE.md
```

UV U0-U7 source foundation remains retained. Its remaining registration/native proof stays LOCAL_CODE/LIVE_BLOCKBENCH and must not block independent parametric-source work.

Current parametric status:

```text
G0 recipe contracts + proof metrics          SOURCE IMPLEMENTED
G1 relational anchor constraint solver       SOURCE IMPLEMENTED
G2 LINEAR / GRID / RADIAL patterns           SOURCE IMPLEMENTED
G3 symmetry relationships                    NEXT
G4 parametric components                     AFTER G3
G5 dependency-aware incremental rebuild      AFTER G4
native recipe apply                          AFTER G3-G5 contracts stabilize
```

Permanent CI proof now guards repeated-structure payload/call efficiency. Current exact fixtures show ~89.9–97.8% serialized payload-proxy reduction; >32-Cube fixtures reduce static mutation batches by 50–75%. These are not wall-clock or token claims.

Immediate order:

1. build G3 symmetry as explicit semantic counterpart relationships, not naive coordinate mirroring;
2. build G4 components from prototypes + anchors + constraints + patterns;
3. add dependency graph and affected-only recompilation before any native recipe mutation surface;
4. preserve lightweight recipe instances until final realization;
5. require LOCAL_CODE wall-clock/memory benchmarks before claiming runtime speed;
6. require LIVE_BLOCKBENCH accepted-result/correction evidence before claiming end-to-end quality superiority.

Do not replace Builder Engine, do not add a visual node editor, and do not make AI emit explicit Cube coordinates when a pattern/constraint expresses the same intent.

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
