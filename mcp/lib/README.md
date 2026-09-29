# `mcp/lib` Ownership

`lib` contains shared Runtime contracts plus domain implementation that is being progressively grouped into explicit domain owners.

## Canonical directories

| Directory | Owner |
| --- | --- |
| `semantic/` | semantic core and incremental semantic model |
| `capabilities/` | canonical Runtime capability metadata |
| `animation/` | animation-domain helpers |
| `texture/` | texture-domain helpers |
| `rig/` | rig-domain helpers |
| `orchestration/` | authoring orchestration primitives |
| `receipts/` | shared mutation receipts |

## Root-file rule

The root is **not** the preferred destination for new domain implementation.

Existing animation/texture/geometry/UV/particle files at the root are legacy migration surfaces. New domain implementation belongs in its domain directory. The repository test `tests/repository/lib-domain-boundary.test.ts` prevents that legacy set from growing.

When a legacy root file is migrated:

1. move implementation to its canonical domain owner;
2. update production imports;
3. retain a compatibility re-export only when an active caller still needs it;
4. remove the migrated filename from the test allowlist;
5. delete the compatibility wrapper after callers reach zero.

See `../docs/04-system/module-boundaries.md` for the full dependency and migration policy.
