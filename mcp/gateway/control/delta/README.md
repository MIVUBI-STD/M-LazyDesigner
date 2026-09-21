# Control Delta

This folder owns post-operation Control state derivation.

- `policy.ts` — static mutation/freshness classification sets.
- `receipts.ts` — Runtime receipt parsing and completeness/state-neutral semantics.
- `verification.ts` — receipt-aware verification class and visual verification scope.
- `freshness.ts` — mutation detection, invalidation domains, freshness scopes and revision evidence.
- `engine.ts` — small assembler that builds the final rich `ControlDelta`.
- `projection.ts` — minimum AI-client projection of the rich internal Control delta.

Dependency direction is one-way:

```text
policy ─┐
        ├─ receipts
        ├─ freshness
        └─ verification
             ↓
           engine
             ↓
         projection
```

`control/delta.ts` is a compatibility facade only. Keep new receipt/freshness policy inside this folder so Control's root stays navigable.
