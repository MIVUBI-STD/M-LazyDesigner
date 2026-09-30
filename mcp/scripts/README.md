# MCP Scripts

This directory contains **developer command implementations**, not production Runtime behavior.

## Navigation

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

`live-e2e-common.ts` is the shared helper for live verification scripts; it is not a runnable command entrypoint.
