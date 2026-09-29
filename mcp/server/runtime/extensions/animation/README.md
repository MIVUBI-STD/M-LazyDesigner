# Animation Runtime Extensions

This directory owns Runtime augmentation for already-registered animation capabilities.

These modules may:

- enrich an existing tool schema;
- wrap an existing executor;
- add native Blockbench-specific behavior;
- invalidate Runtime registration caches when their effective contract changes.

They do **not** own base tool registration. Base animation tools remain under `server/tools`; extension ordering remains owned by `server/runtime/extensions.ts`.

Canonical owners:

```text
nativeIntelligence.ts
controllerNativeIntelligence.ts
runtimeResourceIntelligence.ts
```

The historical `server/tools/animation-*-intelligence.ts` paths are compatibility re-exports only. New Runtime augmentation must not be added to those wrappers.
