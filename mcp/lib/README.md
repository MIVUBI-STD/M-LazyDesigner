# `mcp/lib` Ownership

`lib` contains shared Runtime contracts plus domain implementation that is being progressively grouped into explicit domain owners.

## Canonical directories

| Directory | Owner |
| --- | --- |
| `authoring/` | authoring handoff readiness and validation semantics |
| `bedrock/` | Bedrock project identity and authored project semantics |
| `product/` | LazyDesigner product identity |
| `protocol/` | MCP/resource protocol helpers |
| `runtime/` | Runtime connection, affinity, fetch, and lifecycle primitives |
| `semantic/` | semantic core and incremental semantic model |
| `capabilities/` | canonical Runtime capability metadata |
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

Existing migrated root files are compatibility surfaces only; current canonical owners include `authoring/`, `bedrock/`, `product/`, `protocol/`, `runtime/`, and the existing authoring-domain directories. New domain implementation belongs in its domain directory. The repository test `tests/repository/lib-domain-boundary.test.ts` prevents that legacy set from growing.

When a legacy root file is migrated:

1. move implementation to its canonical domain owner;
2. update production imports;
3. retain a compatibility re-export only when an active caller still needs it;
4. register that wrapper in the single compatibility-wrapper registry enforced by `tests/repository/lib-domain-boundary.test.ts`;
5. delete both the compatibility wrapper and its registry entry after callers reach zero.

The compatibility-wrapper registry is the only root-domain exception list. Do not create a second legacy/migration allowlist for the same paths.

See `../docs/04-system/module-boundaries.md` for the full dependency and migration policy.
