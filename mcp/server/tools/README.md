# Server Tool Ownership

`server/tools` contains Runtime tool implementations. Existing root files are a legacy flat layout; new shared/domain implementation should move toward explicit domain owners without changing MCP capability names.

## Migration rule

- Keep public capability names and executor behavior unchanged.
- Move reusable domain internals into a domain directory such as `animation/`, `texture/`, `particle/`, or `geometry/`.
- Update production imports to the canonical domain path.
- Retain a root compatibility re-export only when an existing import path may still be consumed externally or by older internal code.
- Add migrated wrappers to the repository ownership test so compatibility paths cannot regain implementation logic.

Current migrated animation internals:

```text
server/tools/animation/shared.ts           canonical shared helpers
server/tools/animation/controllerState.ts  canonical controller state helpers
server/tools/animation/effectState.ts      canonical effect state helpers

matching root paths                         compatibility re-export only
```

Do not introduce a second routing/registry layer here. Registration remains owned by `server/runtime/registration.ts`; tool modules own implementation only.
