# LazyDesigner — Bedrock Entity MCP

LazyDesigner uses a stable MCP **Gateway** for normal AI-client connections and a Minecraft **Bedrock Entity-focused** Runtime/plugin inside desktop Blockbench. `Local` is the development authority.

Do **not** use an upstream hosted plugin as runtime authority for this repository. LazyDesigner source/builds come from this repository. The compatibility bundle filename remains `dist/blockit_mcp.js` until bundle/package identifier migration is explicitly mapped.

## Build / Verify

From `mcp/`:

```bash
bun install --frozen-lockfile
bun run verify:full
```

Verification is layered:

- `test:runtime` → executable/import-safe Runtime contracts;
- `verify:authoring` → authoring semantics;
- `verify:repository` → repository/docs/CI contracts;
- `verify:mcp` → executable/public MCP + authoring compatibility;
- `verify:full` → repository + MCP final gate without rerunning the same subset twice.

Use the smallest targeted test during iteration.

## Normal Client Boundary

```text
AI client
  ↓ persistent stdio session
LazyDesigner Gateway
  ↓ reconnectable loopback Streamable HTTP
LazyDesigner Runtime
  ↓
Plugin / Blockbench
```

Normal AI-client use points at the Gateway, not the native Runtime endpoint. Runtime/plugin reload, Runtime rebuild, phase handoff, temporary Runtime loss or Blockbench restart must recover beneath the same Gateway process; only replacing the Gateway process itself requires a client reconnect.

Gateway surface:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Native Runtime/debug endpoint:

```text
https://127.0.0.1:3000/bb-mcp
```

Direct Runtime access is for Inspector/conformance/focused debugging only.

Before the first native load, run `bun run setup:tls` (OpenSSL required; Git for Windows includes it). This creates a machine-local certificate/key outside the repository: `%APPDATA%/LazyDesigner/tls` on Windows, or `$XDG_CONFIG_HOME/LazyDesigner/tls` (default `$HOME/.config/LazyDesigner/tls`) elsewhere. `BLOCKIT_TLS_DIR` may override this with an absolute path shared by Blockbench and the Bun Gateway/live scripts. The private key is never bundled or committed. Blockbench requests native `https` and filesystem permissions through its normal permission mechanism.

The Bun Gateway/live scripts trust that certificate only for loopback requests, retain hostname/expiry validation, and reject redirects. No Windows/system trust-store changes or TLS-verification bypass are needed. The self-signed identity expires after 365 days; setup reuses a valid pair and refuses to overwrite an invalid/incomplete pair. To renew, stop Runtime, explicitly back up/remove both files and rerun setup, then reload Runtime. Clients reread the certificate on each request. Explicit HTTP URLs remain available for isolated protocol/conformance fixtures, not as a native fallback.

## Authoring Model

```text
Approved Reference + Dimensions + Requirements
→ native LazyDesigner Geometry on shared AUTHORING
→ Geometry approval
→ UV Layout PASS
→ Texturing/PBR on shared AUTHORING
→ Texture approval
→ Animation surface when required
→ Finalization
→ validated .bbmodel
```

Geometry and Texturing retain distinct semantic owners but share the AUTHORING Runtime surface. `HANDOFF_REQUIRED` + `switch_authoring_phase` is reserved for AUTHORING↔Animation.

The previous 3D-assisted/Hunyuan/PrimitiveAnything modelling path is retired. Normal modelling has one native Group/Cube authoring path.

Generated API docs and prompt manifests must never be hand-edited.

## Current Source Runtime Surface

```text
Gateway client surface        4 fixed tools
Active phase-union catalog   54 tools
AUTHORING surface            47 tools
Animation surface            18 tools
```

Generated source-doc/prompt snapshots may be stale until the next canonical generator pass. Generated artifacts never override current source/runtime ownership.

Installed Runtime counts and lifecycle state are proof results; see `../docs/05-operations/current-validation.md`.

## Capability Priority

```text
PRIMARY      normal authoring hot path
SUPPORT      valid conditional capability
EXPERIMENTAL explicit matching intent only
MAINTENANCE  legacy/debug fallback; de-prioritized
```

Tiering affects discovery priority only. Known capabilities are invoked directly; bounded search is fallback-only.

Gateway fallback discovery is local and deterministic: BM25 lexical scoring is combined with branch-level semantic metadata and the active authoring phase as a ranking prior. Search may return a compact branch hint (for example `manage_cubes operation=update`); clients should pass that branch to `describe_capability` so unrelated schema branches remain deferred. No embedding model, vector database, external API or extra LLM routing call is required.

Routing quality is guarded separately from static schema-size budgets by `bun run eval:capability-intelligence`, which exercises the actual Gateway search path for Top-1/Top-3 discovery, branch accuracy and bounded projected search payload size.

## Tool / Quality Contract

Tool consolidation is routing-only. Original executors, schemas, validation, native handling and authoring intelligence remain retained.

Technical state is not visual acceptance:

- Validator clear does not mean visual/reference PASS;
- internal quality PASS does not mean user approval;
- tool/export success does not authorize phase handoff;
- Animation handoff requires canonical readiness + checkpoint.

## Legacy UI Fallbacks

Normal authoring has no Standard/Extended choice. Internal `bedrock_entity | extended` identifiers remain compatibility only; `extended` exposes Legacy UI Fallback families for debug/maintenance. `risky_eval` and `from_geo_json` remain disabled.

## Local Development Loop

`BLOCKIT_PLUGIN_PATH` remains a compatibility identifier. Configure it, or pass the destination after `--sync`, then run:

```bash
bun run dev:sync
```

`dev:sync` performs development rebuild → exact-byte deploy → native plugin reload → live build-identity verification. Expected states are `LIVE_SYNCED`, `DEPLOYED_OFFLINE`, or `STALE_BUILD`.

Build only:

```bash
bun run dev:watch
```

Manual deploy:

```bash
bun run deploy:local -- /absolute/path/to/blockit_mcp.js
```

Gateway:

```bash
bun run gateway
```

Native Runtime proof examples:

```bash
bun run verify:stateless-local
bun run verify:geometry-live -- --confirm-disposable
```

These do not prove visual fidelity or accepted asset quality.

## Surface / Context Guard

Static footprint guardrails are maintained by `scripts/measure-default-surface.ts` and `scripts/measure-phase-surfaces.ts`. Control payload diagnostics use `scripts/measure-control-context.ts`. They are not Authoring Efficiency proof.

Normal authoring loads one active specialist. Geometry may additionally load exactly one selected modelling profile. The shared Stage Context document is the canonical cross-stage semantic owner but is loaded only for a material cross-stage/approval/freshness/convergence/handoff ambiguity; it is not a routine second payload.

## Current Capability Shape

Normal authoring includes Cube/Group authoring, hierarchy/rig/pivots, Locator/Null lifecycle, canonical capture, UV Layout mutation/audit, Texture Atlas/Painter/PBR/material instances/render-profile bindings, animation/timeline/effects/controllers, Particle asset support, Undo/history, `.bbmodel` persistence, Bedrock geometry export and stage control.

## Source Layout

```text
gateway/control/          canonical LazyDesigner Control
gateway/                  stable client boundary + Runtime adapter/recovery
index.ts                  thin Blockbench plugin orchestration
plugin/                   RuntimeHost + Blockbench integration + dev reload
server/net.ts             Runtime HTTP/MCP transport + serialization
server/runtime/           registration/surface/consolidation/phase/bootstrap
server/tools/             authored Tool implementations
server/resources/         Runtime Resources
lib/                      schemas/metadata/readiness/factories/runtime helpers
ui/                       Blockbench UI implementation used by integration owner
prompts/                  canonical runtime workflow + generated manifest
build/                    build/docs/manifest tooling
scripts/                  verification/deploy/measurement utilities
tests/                    contract/integration regressions
docs/                     generated Runtime API documentation
```

Detailed source ownership: `../docs/04-system/implementation-map.md`.

Generated API/prompt artifacts follow canonical source + generator output and must never be hand-edited.

## Identity Migration Boundary

Current product-facing identity is LazyDesigner. Primary LazyDesigner Skill identities are migrated; do not recreate removed legacy Skill paths.

Compatibility-bound identifiers intentionally unchanged until dependency-mapped:

```text
package name / MCP server IDs
bundle filename `blockit_mcp.js`
BBPlugin id `blockit_mcp`
BLOCKIT_* environment variables
x-blockit-* affinity headers
persisted setting identifiers
build/provenance identities coupled to the above
```

Do not bulk-rename them.

## Proof Boundary

Continuation → `../docs/05-operations/next-action.md`. Proof interpretation → `../docs/05-operations/current-validation.md`.

Source/static success cannot prove installed Runtime freshness, live Gateway recovery, native Undo/playback/persistence, visual fidelity or measured whole-task savings unless those surfaces actually ran.
