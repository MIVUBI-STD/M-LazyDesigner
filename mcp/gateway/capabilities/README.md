# Gateway Capabilities

This folder owns AI-facing capability discovery and routing.

- `manifest.ts` — canonical branch identity, semantic hints, deferred schema fields and dependency graph metadata.
- `intelligence.ts` — deterministic BM25 + semantic ranking engine.
- `graph.ts` — READY / UNKNOWN / BLOCKED precondition evaluation and ephemeral fact transitions.
- `schemaProjection.ts` — deferred branch-schema projection from the canonical manifest.
- `effects.ts` — Gateway affinity/catalog effect receipt resolution.

Same-purpose files retained at the `gateway/` root are compatibility re-exports only. Do not add new capability data there.

Runtime tool schemas remain authoritative for validation. Core lifecycle/tier/phase metadata lives in `lib/capabilities/manifest.ts`.
