# MCP Developer Commands

Use the smallest stable command surface first.

## Default facade

```bash
bun run check
bun run verify
bun run benchmark
bun run release
```

Meaning:

```text
check      fast repository + type sanity
verify     full source verification
benchmark  benchmark suite
release    security + full release gate
```

Normal Codex work should prefer these commands unless the affected owner requires a narrower command.

For a bounded source change with known changed paths, prefer the affected route before a broad gate:

```bash
bun run plan:affected -- <changed-path> [...]
bun run verify:affected -- <changed-path> [...]
```

This resolves canonical source ownership, anchor tests, shared contracts, project-graph checks, and domain invalidation from the changed paths. Use `verify`/full verification only when the planner requires it or for explicit final acceptance.

## Narrow command namespaces

```text
typecheck:*   compiler/type checks
test:*        focused test groups
verify:*      focused verification gates
measure:*     static/context/surface measurements
benchmark:*   benchmark implementations
eval:*        evaluation harnesses
audit:*       static audits
plan:*        deterministic execution planning
report:*      generated diagnostic reports
deploy:*      local/verified deployment
generate:*    generated owned artifacts
docs:*        documentation build/check/serve
security:*    dependency/security audit
```

These are implementation-level commands, not equivalent entrypoints.

## Rule

Do not add an unnamespaced script unless it is a stable developer facade with a distinct purpose. New specialized commands must use the narrowest existing namespace instead of creating synonyms such as `validate`, `verify-all`, `full-check`, or `test-everything`.