# LazyDesigner Compatibility Identifier Boundary

Updated: 2026-09-18

This file owns the migration boundary for identifiers that still contain `BlockIT` / `blockit` after the product rename.

```text
presentation identity may migrate independently
protocol / persisted / install identity may not
```

Do not bulk-replace `blockit` across the repository.

## Compatibility-Bound Identifiers

These values remain stable until a dedicated migration updates every producer, consumer, persisted value and recovery path.

| Identifier | Current value | Canonical owner | Why retained |
| --- | --- | --- | --- |
| npm/package identity | `blockit-bedrock-entity-mcp` | `mcp/package.json` | package/build/dependency identity |
| production bundle path | `dist/blockit_mcp.js` | package/build/deploy owners | installed file/update continuity |
| Blockbench plugin id | `blockit_mcp` | `mcp/index.ts` | installed plugin identity/reload continuity |
| Gateway MCP server name | `blockit-gateway` | `mcp/gateway/contract.ts` | client/server identity continuity |
| Runtime URL env prefix | `BLOCKIT_RUNTIME_*` | `mcp/gateway/backend.ts` | deployment/config compatibility |
| Gateway queue env key | `BLOCKIT_GATEWAY_MAX_QUEUE_DEPTH` | `mcp/gateway/backend.ts` | deployment/config compatibility |
| project affinity header | `x-blockit-project-uuid` | `mcp/gateway/projectAffinity.ts` | Gateway↔Runtime protocol compatibility |
| authoring phase header | `x-blockit-authoring-phase` | `mcp/gateway/projectAffinity.ts` | Gateway↔Runtime protocol compatibility |
| extended-family localStorage key | `blockit_mcp.extended_families_enabled` | `mcp/ui/settings.ts` | persisted user setting continuity |
| authoring stage setting id | `mcp_authoring_phase` | `mcp/lib/authoringPhase.ts` | persisted Blockbench setting continuity |
| extended-family setting id | `mcp_extended_families_enabled` | `mcp/lib/registrationProfile.ts` | persisted Blockbench setting continuity |

Primary LazyDesigner Skill paths are **not** compatibility-bound. REFERENCE_PREPARATION, ASSET_AUTHORING, and PRODUCT_DEVELOPMENT primary Skills now use canonical `lazydesigner-*` identities; removed legacy paths must not return as aliases.

Internal TypeScript symbols, DOM class names, event keys, or client names may still contain `Blockit`/`BLOCKIT` when renaming them provides little current value. Never change a serialized/string compatibility value accidentally during cosmetic cleanup.

The following distribution/release strings are also treated as compatibility-bound until an atomic release migration maps every producer and consumer: `blockit.exe`, `blockit-package.json`, `blockit-windows-x64.zip`, GitHub artifact names beginning with `blockit-`, and the `blockit-v*` release-tag prefix. They are delivery identifiers, not the product name.

## Presentation Identity

Human-visible product language should use **LazyDesigner** when it does not change a serialized identifier or external contract.

Safe presentation migration now covers current source for:

```text
MCP server initialize/instructions
Gateway backend status/errors
plugin lifecycle/install/dev-sync messages
Blockbench panel + status bar
local install guidance
mcp/llms.txt
packaged authoring AGENTS + package source notice
repository operating-rule headings
```

Safe presentation migration includes:
- docs/headings/descriptions;
- QuickMessages and logs;
- human-readable errors;
- comments describing the current product;
- MCP titles/descriptions where protocol names remain unchanged.

Do not expose compatibility residue as a second product name.

## Generated Documentation Boundary

`mcp/build/docs.ts` still owns generated API HTML presentation and currently has stale pre-rename display strings in its generated template. `mcp/docs/api.json` / `mcp/docs/index.html` are generated outputs and must not be hand-edited.

Because the current context is `REMOTE_GITHUB` and canonical generated output requires `LOCAL_CODE` generator execution, treat this as one bounded source+generation residue:

```text
LOCAL_CODE
→ update generator presentation source
→ bun run docs:build
→ bun run docs:check
→ commit source + generated output together
```

Do not mutate the generator into a state that leaves committed generated output knowingly stale.

## Migration Preconditions

A compatibility-bound identifier may change only when all of the following are mapped in one coherent migration:

```text
producer(s)
consumer(s)
persisted/install state
generated/build outputs
tests/CI/deploy scripts
rollback/recovery behavior
```

For persisted/install identifiers, migration must define whether old state is read, transformed, dual-read temporarily, or intentionally invalidated. Do not create permanent dual identity.

## Current Priority

```text
1. keep compatibility-bound serialized values stable
2. keep current human-facing source presentation on LazyDesigner
3. defer generator-coupled API-doc branding until LOCAL_CODE can regenerate canonical output
4. do not rename internal Blockit/BLOCKIT symbols merely for cosmetics
5. rename a compatibility-bound value only as an atomic dedicated migration
```

## Proof Boundary

This document and source regressions can prove repository intent and string ownership. They do not prove installed migration, persisted-setting upgrade, live Gateway compatibility, regenerated API output, or Blockbench plugin replacement behavior until exercised in the appropriate local/live context.
