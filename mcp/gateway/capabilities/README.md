# Gateway Capabilities

This folder owns AI-facing capability discovery and routing.

- `types.ts` — shared branch/routing/readiness fact contract types.
- `manifest.ts` — canonical branch identity, semantic hints, deferred schema fields and dependency graph metadata.
- `intelligence.ts` — deterministic BM25 + semantic ranking engine.
- `catalog.ts` — capability summarization + state-aware ranked catalog search.
- `graph.ts` — READY / UNKNOWN / BLOCKED precondition evaluation and ephemeral fact transitions.
- `schemaProjection.ts` — deferred branch-schema projection from the canonical manifest.
- `effects.ts` — Gateway affinity/catalog effect receipt resolution.
- `semanticRegistry.ts` — read-only compiled semantic catalog/fingerprints derived from the canonical manifest.
- `semanticDependencyMatrix.ts` — product semantic-surface dependency and refresh mapping.
- `semanticFreshness.ts` — deterministic consumer freshness against semantic catalog revisions.

Same-purpose files retained at the `gateway/` root are compatibility re-exports only. Do not add new capability data there.

Runtime tool schemas remain authoritative for validation. Core lifecycle/tier/Stage metadata lives in `lib/capabilities/manifest.ts`. Engineering verification/check selection remains under `gateway/development/`; product status and capability surfaces must not depend on development-only planners.
