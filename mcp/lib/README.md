# `mcp/lib` Ownership

`lib` contains shared Runtime contracts plus domain implementation that is being progressively grouped into explicit domain owners.

## Canonical directories

| Directory | Owner |
| --- | --- |
| `authoring/` | authoring handoff readiness and validation semantics |
| `bedrock/` | Bedrock project identity, Molang, export, and authored project semantics |
| `product/` | LazyDesigner product identity |
| `prompts/` | prompt contract and loading |
| `reference/` | reference evidence, correction, and style interpretation |
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

See `../docs/04-system/module-boundaries.md` for the full dependency and migration policy.


## Intentional root primitives

Only these implementation owners are intentionally kept at `lib/` root:

```text
factories.ts   MCP Tool/Resource/Prompt factories + registration/result primitives
constants.ts   tiny package constants
```

Everything with a narrower semantic owner belongs in a canonical subdomain. Compatibility wrappers may remain temporarily but must contain only a re-export.


Compatibility facades `util.ts` and `zodObjects.ts` remain only to avoid broad import churn. New code must import the canonical owner directly.


### Factory boundary

`factories.ts` intentionally remains cohesive. Tool, Resource, and Prompt registration share one request-owned MCP registry/cache lifecycle. Splitting it would require an additional shared registry/cache layer without reducing semantic ambiguity. Refactor it only when a concrete independent lifecycle or dependency boundary appears; file size alone is not sufficient reason.
