# LazyDesigner

LazyDesigner is an AI-assisted **Minecraft Bedrock Entity** authoring workspace built around a local Blockbench MCP Runtime, a stable AI-client-facing Gateway, and a lightweight Control front line for context-efficient Codex work.

**Former project name:** BlockIT. Internal `blockit-*` compatibility identifiers and legacy filenames may remain temporarily during the controlled migration; they are not the current product name.

**Project snapshot:** `v0.1` (separate from the MCP package version).

## Branch Model

```text
Local  → active development / working authority
main   → stable / release authority; changes only by explicit promotion
```

Routine repository development uses `Local`. Repository behavior is routed by `AGENTS.md`; GitHub execution/history/CI rules are owned by `GITHUB_RULES.md`.

## Canonical Product Flow

```text
User request
→ ChatGPT Reference Preparation
→ Reference Package
→ LazyDesigner Control
→ Codex
→ Gateway
→ Runtime
→ Blockbench
→ verification / approval / checkpoint
→ Finalization
```

ChatGPT owns **reference preparation**, not Blockbench execution. Control remains a thin routing/context layer and must not duplicate canonical Skills, Tool schemas, workspace state, or creative reasoning.

The approved image is visual authority. Requested dimensions are numeric authority. LazyDesigner has **one native modelling path**; the retired 3D-assisted/Hunyuan/PrimitiveAnything path is not part of current authoring.

## Documentation

Start from:

```text
docs/README.md
```

The documentation is organized for selective AI retrieval:

```text
docs/
├── 01-product/      product identity, requirements, end-to-end flow
├── 02-reference/    ChatGPT reference preparation and Codex handoff package
├── 03-authoring/    modelling, texture, animation, validation, finalization
├── 04-system/       Control, source ownership, Skill taxonomy
└── 05-operations/   current proof, next action, local acceptance
```

Do not load the whole documentation tree by default. Select the current domain and read only its canonical owner(s).

Current state owners:

- documentation entry point → `docs/README.md`
- stable project facts → `CONTEXT.md`
- product flow → `docs/01-product/flow.md`
- reference preparation → `docs/02-reference/README.md`
- reference package → `docs/02-reference/package/README.md`
- authoring policy → `docs/03-authoring/README.md`
- system/source ownership → `docs/04-system/README.md`
- repository/plugin continuation → `docs/05-operations/next-action.md`
- current proof state → `docs/05-operations/current-validation.md`
- asset continuity → `workspace/README.md`

Historical audits, retired product paths, obsolete continuation, and old roadmaps belong in Git history rather than parallel current-state owners.

## Current Product Surface

```text
Control                     front-line context/readiness/routing
Gateway client surface      4 fixed tools
Active phase-union catalog 54 tools
AUTHORING source surface   47 tools
Animation source surface   18 tools
```

Gateway tools are always:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Geometry and Texturing startup focus values resolve to the same shared AUTHORING capability set. AUTHORING↔Animation handoff is Gateway-managed and continues the same task/chat; normal client use does not require a manual MCP reconnect.

Normal authoring has no Standard/Extended profile choice. Internal `extended` remains Legacy UI Fallback compatibility only; `risky_eval` and `from_geo_json` remain disabled.

Installed Runtime counts and lifecycle behavior are proof results, not hand-maintained product facts. See `docs/05-operations/current-validation.md`.

## Evidence Boundary

Static source/CI proof can establish routing, contracts, schemas, deterministic build output, and fail-closed source behavior. It does **not** prove installed Blockbench state, live Gateway survival, visual fidelity, native Undo/playback/persistence, or accepted asset quality.

## Repository Map

```text
.agents/skills/    task/domain specialists loaded only when relevant
docs/              hierarchical canonical documentation; start at docs/README.md
apps/desktop/      Tauri/Svelte/Rust desktop machine control plane
mcp/               Blockbench MCP plugin/runtime/Gateway/Control/build/tests/generated API docs
workspace/         persistent active/saved asset packages
Experimental/      bounded research only
```

## Development

LazyDesigner source/builds come from this repository; do not use an upstream hosted plugin as runtime authority for this repository. Legacy output filename `dist/blockit_mcp.js` remains during the controlled identifier/file migration.

From `mcp/`:

```bash
bun install --frozen-lockfile
bun run verify:full
```

Recommended local development sync:

```bash
bun run dev:sync
```

Build/watch without deployment:

```bash
bun run dev:watch
```

Manual deployment remains explicit while legacy filenames are present:

```bash
bun run deploy:local -- /absolute/path/to/blockit_mcp.js
```

Normal AI-client use connects through Control and the Gateway. See `mcp/gateway/README.md`.

## Contributing

Repository development conventions, verification routing, commit discipline, and transient-file rules are documented in `CONTRIBUTING.md`.

## License

LazyDesigner is distributed under the GNU General Public License v3.0. See `LICENSE` for the full terms.
