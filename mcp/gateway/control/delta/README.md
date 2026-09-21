# Control Delta

This folder owns post-operation Control state derivation.

- `engine.ts` — mutation classification, freshness/invalidation inference, receipt-aware verification class, next-intent assembly.
- `projection.ts` — minimum AI-client projection of the rich internal Control delta.

`control/delta.ts` is a compatibility facade only. Keep new receipt/freshness policy inside this folder so Control's root stays navigable.
