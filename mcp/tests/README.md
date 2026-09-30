# MCP Tests

Tests are organized by **proof responsibility**, not by product marketing feature.

## Fast navigation

```text
tests/repository/   repository architecture, naming, ownership, docs, CI contracts
tests/authoring/    authoring policy and workflow contracts
tests/benchmark/    benchmark, golden-session, Hybrid evidence and efficiency contracts
tests/live/         LIVE_BLOCKBENCH/local-runtime verification contracts
tests/fixtures/     deterministic test input only
tests/*.test.ts     focused domain/runtime/integration regressions retained at package scope
```

For implementation work, run the smallest owning test first. Do not scan the entire test directory to discover source ownership; use `../../docs/04-system/implementation-map.md` first.

When changed source paths are already known, use `bun run plan:affected -- <path> [...]` to resolve the anchor tests and shared contracts instead of manually scanning the flat top-level test set. `bun run verify:affected -- <path> [...]` executes that bounded plan.

## Naming

Top-level test filenames use lowercase kebab-case and describe the behavior/contract being protected. A test must not become a second source-of-truth for product semantics: assert the canonical owner rather than copying large policy tables into test code.

New repository-structure rules belong under `tests/repository/`. New reusable test helpers/fixtures belong in a clearly named subdirectory rather than the test root.