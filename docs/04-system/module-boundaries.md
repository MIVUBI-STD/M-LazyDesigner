# LazyDesigner Module Boundaries

This document defines the maintainability boundary for active LazyDesigner source. It is an architectural ownership contract, not a proposal for a big-bang rewrite.

## Goals

- one canonical owner for each concern;
- dependency direction is explicit and testable;
- domain logic does not accumulate in shared root namespaces;
- compatibility aliases are temporary migration surfaces;
- refactors preserve Runtime behavior, MCP public surface, schemas, validation and native Blockbench semantics.

## Layer direction

```text
Core / shared contracts
        |
        +--> Geometry
        +--> UV
        +--> Texture
        +--> Rig
        +--> Animation
        +--> Particle
                 |
                 v
        Authoring application
                 |
                 v
              Runtime
                 |
                 v
              Gateway
                 |
                 v
             AI client
```

Dependencies must not point upward. Domain modules must not depend on Gateway or Control orchestration.

## Current physical owners

```text
mcp/lib/semantic/        semantic core
mcp/lib/capabilities/    canonical Runtime capability metadata
mcp/lib/animation/       animation domain helpers
mcp/lib/texture/         texture domain helpers
mcp/lib/rig/             rig domain helpers
mcp/lib/orchestration/   authoring orchestration helpers
mcp/lib/receipts/        shared mutation receipt contracts

mcp/server/tools/        authored capability implementations
mcp/server/runtime/      Runtime registration, routing and lifecycle composition
mcp/server/resources/    Runtime resources

mcp/gateway/capabilities/ AI routing/search/schema projections
mcp/gateway/runtime/      Gateway-to-Runtime lifecycle and affinity
mcp/gateway/control/      context/readiness/source ownership orchestration
mcp/gateway/providers/    leaf local providers
mcp/gateway/presentation/ normalized AI-facing result/status projection
mcp/gateway/contracts/     stable Gateway protocol/output contracts
```

## Root `mcp/lib` policy

The root of `mcp/lib` is a migration/shared-contract surface. Existing domain-prefixed files may remain while callers are migrated, but **new domain implementation files must not be added there**.

New domain code belongs under a domain directory. Examples:

```text
animation*  -> lib/animation/
texture*    -> lib/texture/
rig*        -> lib/rig/
```

Geometry, UV and Particle currently have legacy root ownership that will be migrated incrementally. New implementation should prefer a dedicated domain directory when the ownership is unambiguous.

Do not create a generic `shared`, `common` or `helpers` dumping ground. A shared primitive must have at least two real owners and no domain-specific semantics.

## Public module rule

A mature domain should expose a small public entry surface and keep implementation details internal. External callers should prefer the domain entry surface rather than reaching into unrelated implementation internals.

This is introduced incrementally. Existing direct imports are not justification for new ones.

## Compatibility lifecycle

Compatibility wrappers are allowed only for controlled migration:

```text
canonical owner
     ^
compatibility wrapper
     ^
legacy caller
```

Lifecycle:

1. introduce canonical owner;
2. migrate production imports;
3. retain wrapper only while callers remain;
4. verify zero active callers;
5. delete wrapper.

A compatibility path must not become a second canonical owner.

## Large-module rule

Large files are not automatically wrong. A split is required when a file owns multiple independent reasons to change.

Priority review surfaces:

- `server/net.ts`: transport, serialization, request context, generation and affinity should progressively become focused transport modules;
- `gateway/backend.ts`: backend composition should delegate catalog cache, invocation, lifecycle, queue and affinity policy to focused owners.

The facade may remain stable while implementation moves underneath it.

## Compile-time direction

TypeScript project references are the preferred hard boundary. The long-term graph should progress toward domain-level projects rather than one broad Runtime compilation universe.

Do not add project references only for appearance. A new project boundary is justified when it:

- prevents an invalid dependency;
- enables focused affected builds/tests;
- separates independently changing ownership.

## Migration order

1. freeze new root-domain drift;
2. move one low-coupling domain cluster at a time;
3. preserve compatibility only where active callers require it;
4. add project-reference boundaries after physical ownership is stable;
5. split Runtime transport and Gateway backend by responsibility;
6. retire obsolete wrappers.

Every step must preserve existing MCP capability behavior and pass the smallest affected contract suite before broader verification.

## Non-goals

This work does **not**:

- change the four-tool Gateway public surface;
- reduce capability intelligence;
- replace retained executors with generic abstractions;
- introduce a second Runtime or Control system;
- turn every domain into a plugin;
- add abstraction without an ownership or dependency benefit.

## Repository navigation contract

Navigation is part of the architecture. Large source surfaces must expose a local `README.md` that answers only three questions: what belongs here, what does not belong here, and where the canonical owner is.

Path status is explicit:

```text
canonical      implementation/source-of-truth
entrypoint     composition or registrar boundary
compatibility  temporary import/name preservation only
generated      machine-owned output; never hand-edited
```

A compatibility path must never be documented as a canonical owner. Generated MCP API output under `mcp/docs/` is separate from durable product/system documentation under repository-root `docs/`.

Repository tests enforce the stable MCP package navigation surface so new root folders or ambiguous unclassified top-level files require an intentional architecture change rather than accumulating silently.
