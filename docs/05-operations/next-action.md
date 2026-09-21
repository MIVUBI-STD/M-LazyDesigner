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

## Active Development — UV Authoring Engine

Architecture owner:

```text
mcp/docs/UV_AUTHORING_ENGINE.md
```

The previous Texture Compute C1-C5 / AI-efficiency source hardening remains retained and must not be restarted without new evidence.

Current UV source status:

```text
U0 core contracts                        SOURCE IMPLEMENTED
U1 deterministic island extraction       SOURCE IMPLEMENTED
U2 physical-pixel / density planning     SOURCE IMPLEMENTED
U3 declarative constraint rules          SOURCE IMPLEMENTED
U4 deterministic MaxRects planner        SOURCE IMPLEMENTED
U5 stable incremental packing modes      SOURCE IMPLEMENTED
U6 evidence-driven stack proposals        SOURCE IMPLEMENTED
U7 native adapter/atomic service           SOURCE IMPLEMENTED
U7 capability registration                LOCAL_CODE GENERATOR PENDING
U8 native compatibility/save-reopen       LIVE_BLOCKBENCH PENDING
U9 optional xatlas mesh backend            DEFERRED
```

U0-U5 are planning-only and do not replace existing production UV mutation.

Immediate order:

1. keep current production `manage_cubes` and `create_texture(template)` paths unchanged until generator-backed capability registration;
2. in LOCAL_CODE, register one Texturing Runtime capability `manage_uv_layout` using the already-tested plan/apply request contract;
3. run the canonical docs generator instead of hand-editing generated API output;
4. rerun full source gates on the generated-doc SHA;
5. then use LIVE_BLOCKBENCH to prove Undo/Redo, save/reopen, native audit and visual mapping behavior.

Remote source work below registration is complete enough to stop adding architecture layers without new evidence.

Key invariant:

```text
AI/UI declares UV intent
→ UV Core computes deterministic coordinates
→ native adapter applies only an explicit plan
```

Do not create another public Gateway tool only for UV. Do not put packing policy inside `manage_cubes`. Do not integrate xatlas/GPU/WASM before Cube-centric planning and native apply are proven.

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
