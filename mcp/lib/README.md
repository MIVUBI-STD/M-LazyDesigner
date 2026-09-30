# `mcp/lib` Ownership

`lib` contains shared Runtime contracts plus domain implementation that is being progressively grouped into explicit domain owners.

## Canonical directories

| Directory | Owner |
| --- | --- |
| `authoring/` | lifecycle truth: health, readiness, validation, semantic history |
| `authoringRecipe/` | declarative recipe semantics, planning, incremental rebuild, bounded plan/apply lifecycle |
| `bedrock/` | Bedrock project identity, Molang, export, and authored project semantics |
| `product/` | LazyDesigner product identity |
| `prompts/` | prompt contract and loading |
| `reference/` | reference evidence, correction, visual-evidence vocabulary, and style interpretation |
| `protocol/` | MCP/resource protocol helpers |
| `runtime/` | Runtime connection, affinity, fetch, and lifecycle primitives |
| `semantic/` | semantic core and incremental semantic model |
| `schemas/` | shared domain-oriented Zod schemas |
| `capabilities/` | canonical Runtime capability metadata, Authoring Stage, registration profile, and surface manifest |
| `core/` | shared identity and JSON value primitives |
| `blockbench/` | Blockbench compatibility policy projection |
| `animation/` | animation-domain helpers |
| `geometry/` | geometry analysis/evidence helpers |
| `texture/` | texture-domain helpers |
| `rig/` | rig-domain helpers |
| `particle/` | particle resource/layout/write-transaction helpers |
| `uv/` | UV evidence and UV-domain helpers |
| `orchestration/` | authoring orchestration primitives |
| `receipts/` | shared mutation receipts |

## Root-file rule

The root is **not** the preferred destination for new domain implementation.

Existing migrated root files are compatibility surfaces only; current canonical owners include `authoring/`, `bedrock/`, `product/`, `prompts/`, `protocol/`, `reference/`, `runtime/`, and the existing domain directories. New domain implementation belongs in its domain directory. The repository test `tests/repository/lib-domain-boundary.test.ts` prevents that legacy set from growing.

When a legacy root file is migrated:

1. move implementation to its canonical domain owner;
2. update production imports;
3. retain a compatibility re-export only when an active caller still needs it;
4. register that wrapper in the single compatibility-wrapper registry enforced by `tests/repository/lib-domain-boundary.test.ts`;
5. delete both the compatibility wrapper and its registry entry after callers reach zero.

The compatibility-wrapper registry is the only root-domain exception list. Do not create a second legacy/migration allowlist for the same paths.

See `../../docs/04-system/module-boundaries.md` for the full dependency and migration policy.


## Intentional root primitives

Only these implementation owners are intentionally kept at `lib/` root:

```text
factories.ts   MCP Tool/Resource/Prompt factories + registration/result primitives
constants.ts   tiny package constants
```

Everything with a narrower semantic owner belongs in a canonical subdomain. Compatibility wrappers may remain temporarily but must contain only a re-export.


Compatibility facades `util.ts` and `zodObjects.ts` now have no production-source callers. They remain compatibility-only for bounded legacy/test/external import stability; production code is forbidden from importing them and must use the exact canonical owner under `core/`, `blockbench/`, `protocol/`, `texture/`, or `schemas/`.


## Compatibility retirement state

Active production source is guarded against the retired root facades listed by repository ownership tests. In particular, `util.ts` and `zodObjects.ts` are production-zero-caller compatibility surfaces.

Deletion remains a separate compatibility action:

```text
canonical owner adopted
→ production callers = 0
→ local/runtime compatibility proof
→ external reference check
→ delete wrapper + registry entry
```

Do not preserve a wrapper merely because it existed historically, and do not delete it solely from remote source evidence.

### Factory boundary

`factories.ts` intentionally remains cohesive. Tool, Resource, and Prompt registration share one request-owned MCP registry/cache lifecycle. Splitting it would require an additional shared registry/cache layer without reducing semantic ambiguity. Refactor it only when a concrete independent lifecycle or dependency boundary appears; file size alone is not sufficient reason.