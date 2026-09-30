# Authoring Orchestration Domain

Owns execution sequencing and verification planning across authoring domains.

```text
impact
execution order
execution strategy
verification plan
evidence plan
freshness projection
correction continuation / loop
visual observation
```

This domain answers **when and in what order work should execute and be re-verified**.

Orchestration may consume pure authoring/recipe/reference contracts, but it must not import Gateway, Runtime executors, or Blockbench tool implementations. Runtime-specific adapters remain outside `lib/`.

Evidence registries remain domain-specific: recipe evidence represents recipe identity/apply receipts, while orchestration evidence represents scoped verification evidence with runtime/project invalidation semantics. Do not merge them into a generic registry solely because both use bounded maps.
