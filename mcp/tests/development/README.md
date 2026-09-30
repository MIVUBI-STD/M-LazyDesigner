# Development Tests

This directory owns tests for repository development intelligence rather than product/runtime behavior.

```text
affected-execution.test.ts         changed paths → bounded verification plan
affected-runner-portability.test.ts portable affected-plan runner
affected-semantic-snapshot.test.ts semantic snapshot-aware planning
development-context-plan.test.ts   bounded Codex read-target planning
development-symbol-map.test.ts     TypeScript symbol-map generation
domain-invalidation.test.ts        authoring-domain blast-radius classification
semantic-impact.test.ts            capability/source semantic impact
semantic-invalidation.test.ts      semantic invalidation planning
semantic-registry-diff.test.ts     semantic registry diff behavior
```

These tests protect development tooling and must not become capability/runtime acceptance owners.
