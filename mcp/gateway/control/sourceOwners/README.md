# Control Source Owners

This folder owns explicit capability -> source/specialist/test ownership mappings.

- `geometry.ts` — Geometry capability owners.
- `texturing.ts` — Texturing capability owners.
- `animation.ts` — Animation capability owners.
- `core.ts` — Core/read-only/phase-control capability owners.

`../sourceOwners.ts` only composes these maps, applies domain fallback ownership, and exposes lookup helpers. Keep domain-specific entries here so edits remain localized and duplicate keys are caught by tests.
