# Runtime Ownership

`server/runtime/` owns Runtime composition, registration, and Blockbench-facing runtime adapters.

## Core root owners

```text
bootstrap.ts            exactly-once runtime bootstrap
registration.ts         capability registration/surface ownership
consolidatedRoutes.ts   declarative branch → executor routing
consolidatedTools.ts    routing-only public wrappers
extensions.ts           runtime extension composition
phaseControl.ts         AUTHORING ↔ Animation handoff
```

## Canonical subdomains

```text
contracts/              runtime-specific tool contract enrichment
recipes/authoring/      parametric authoring recipe ownership/runtime/service
recipes/material/       material recipe runtime adapter
uv/                     semantic UV + UV layout runtime/service
extensions/             post-registration runtime extensions
```

Migrated root files are compatibility re-export facades only. New runtime implementation belongs in the narrowest existing subdomain instead of creating another root peer.

Dependency direction:

```text
core runtime → canonical runtime subdomains
runtime subdomains → lib / server tools as required
runtime implementation → gateway forbidden
```
