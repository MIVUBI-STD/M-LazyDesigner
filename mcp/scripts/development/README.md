# Development Scripts

This directory owns bounded source-development planning and derived development context.

```text
analyze-semantic-impact.ts       changed paths → affected capability graph
build-development-symbol-map.ts  intent → bounded TypeScript symbol map
build-knowledge-index.ts         repository knowledge → deterministic section index
plan-development-context.ts      intent/change set → bounded Codex read targets
plan-affected-execution.ts       changed paths → minimum safe verification plan
run-affected-execution.ts        execute the bounded affected plan
plan-semantic-invalidation.ts    semantic diff → invalidation/check plan
snapshot-semantic-registry.ts    canonical semantic registry snapshot
```

These scripts may consume canonical Gateway/lib owners, but product/runtime source must never depend on this directory.

Prefer the package commands rather than invoking files directly:

```bash
bun run plan:development-context -- "<intent>" --changed <path>
bun run plan:affected -- <path>
bun run verify:affected -- <path>
bun run analyze:semantic-impact -- <path>
```
