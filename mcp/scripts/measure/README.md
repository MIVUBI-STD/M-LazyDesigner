# Measurement Scripts

This directory owns deterministic static/context/surface measurements used for development evidence.

```text
measure-default-surface.ts          default Runtime surface size
measure-stage-surfaces.ts           per-Stage Runtime surface metrics
measure-control-context.ts          Control context projection size
measure-continuation-checkpoint.ts  continuation checkpoint compaction proxy
measure-astra-context.ts            Astra-oriented payload/context comparison
measure-model-context-footprint.ts  model/client context footprint
measure-describe-payloads.ts        describe-capability payload size
measure-mcp-efficiency.ts           bounded MCP efficiency scorecard inputs
```

Measurements are diagnostic evidence, not product/runtime owners and not acceptance claims unless a higher-level verifier explicitly consumes them.
