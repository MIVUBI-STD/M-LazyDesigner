# Development Source Owners

Owns explicit Capability → implementation source / specialist / anchor-test mappings for repository-development diagnosis.

- `geometry.ts` — Geometry capability source owners.
- `texturing.ts` — Texturing capability source owners.
- `animation.ts` — Animation capability source owners.
- `core.ts` — Core/read-only/Runtime-surface-control source owners.

`../sourceOwners.ts` composes these maps, applies bounded fallback ownership, and exposes lookup helpers.

These mappings are engineering metadata. They do not own Runtime capability semantics, authored asset state, or Control workflow state.
