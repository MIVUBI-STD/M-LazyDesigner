# MCP Scripts

This directory contains **developer command implementations**, not production Runtime behavior.

## Navigation

`audit/` owns static audits. `benchmark/` owns deterministic benchmark implementations. `development/` owns development context/routing/affected-verification planning. `evaluate/` owns deterministic evaluation/policy harnesses. `generate/` owns generated schema/index tooling. `measure/` owns deterministic context/surface/payload measurements. `operations/` owns local deploy/setup/conformance/artifact operations, including live development sync. `reporting/` owns benchmark-session reporting/comparison/finalization. `verify/` owns focused local/live verification plus the shared live helper.

Use the command namespace before opening a script:

| Prefix | Purpose |
| --- | --- |
| `verify-` | focused source/live verification |
| `benchmark-` | benchmark execution |
| `evaluate-` | deterministic evaluation harnesses |
| `measure-` | static/context/surface measurement |
| `plan-` | deterministic execution planning |
| `generate-` / `build-` | owned generated artifacts and indexes |
| `deploy-` / `setup-` | local environment/deployment setup |
| `report-` / `summarize-` / `compare-` / `finalize-` | bounded diagnostics and benchmark reporting |

The stable human/Codex command facade remains in `../COMMANDS.md` and `../package.json`. Prefer `bun run check|verify|benchmark|release` before selecting a narrow script.

## Boundary

```text
scripts → production source     allowed
production source → scripts     forbidden
```

Do not place Runtime, Gateway, Blockbench mutation, authoring semantics, or reusable domain logic here. Put those under their canonical source owner and let a script call that owner.

`verify/live-e2e-common.ts` is the shared helper for live verification scripts; it is not a runnable command entrypoint.

## Production boundary

Build code under `../build/` may produce deterministic Runtime artifacts and watch production inputs, but it must not deploy artifacts, probe the installed Runtime, or own machine mutation. Those development-only effects belong under `operations/`. Product install/update/rollback ownership lives at repository-root `distribution/`, outside the MCP Runtime package.
