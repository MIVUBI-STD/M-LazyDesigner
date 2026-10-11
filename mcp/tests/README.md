# MCP Tests

Tests are organized by **proof responsibility**, not by product marketing feature.

## Fast navigation

```text
tests/repository/   repository architecture, naming, ownership, docs, CI contracts
tests/authoring/    authoring policy and workflow contracts
tests/benchmark/    benchmark, golden-session, Hybrid evidence and efficiency contracts
tests/contracts/    shared mutation/continuation receipt contracts
tests/development/  development routing, affected execution and semantic invalidation
tests/live/         LIVE_BLOCKBENCH/local-runtime verification contracts
tests/runtime/      executable Runtime/transport behavior contracts
tests/fixtures/     deterministic test input only
tests/*.test.ts     focused domain/runtime/integration regressions retained at package scope
```

For implementation work, run the smallest owning test first. Do not scan the entire test directory to discover source ownership; use `../../docs/04-system/implementation-map.md` first.

When changed source paths are already known, use `bun run plan:affected -- <path> [...]` to resolve the anchor tests and shared contracts instead of manually scanning the flat top-level test set. `bun run verify:affected -- <path> [...]` executes that bounded plan.

## Naming

Top-level test filenames use lowercase kebab-case and describe the behavior/contract being protected. A test must not become a second source-of-truth for product semantics: assert the canonical owner rather than copying large policy tables into test code.

New repository-structure rules belong under `tests/repository/`. New reusable test helpers/fixtures belong in a clearly named subdirectory rather than the test root.

## Affected tests and data fixtures

- Changes to executable `*.test.ts` files select that file directly. Tests under `tests/repository/` and `tests/authoring/` use their existing complete owner suites instead; do not execute them twice.
- The regression, golden-task, and quality-benchmark JSON corpora have existing benchmark contract tests and select those bounded owners. A fixture without a proven owner still falls back to the full gate; never silently skip verification.
- `REGRESSION_GUARDED` records an intended safeguard, not a pass at the current commit. Synthetic quality cases cannot establish live/native quality or a measured baseline.
- Consolidate tests only after proving redundant failure modes. Keep independent negative cases and unique integration boundaries even when tests look similar. Prefer executable behavior/contracts over assertions tied to incidental source text.
