# Benchmark Scripts

This directory owns deterministic benchmark implementations and benchmark-only comparison fixtures.

```text
benchmark-authoring-orchestration.ts
benchmark-gateway-hot-path.ts
benchmark-gateway-replay-shadow.ts
benchmark-material-recipe.ts
benchmark-motion-recipe.ts
benchmark-parametric-authoring.ts
benchmark-semantic-invalidation-scope.ts
benchmark-semantic-rig.ts
benchmark-semantic-uv.ts
benchmark-zero-waste-bottlenecks.ts
benchmark-zero-waste-golden.ts
benchmark-zero-waste-total-context.ts
benchmark-zero-waste-workflow.ts
```

Benchmarks may import canonical product/runtime owners and measurement helpers, but production source must never depend on benchmark code. Invoke them through the `benchmark:*` package commands.
