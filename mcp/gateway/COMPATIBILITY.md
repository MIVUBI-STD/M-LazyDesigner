# Gateway Compatibility Wrappers

The files below exist only to preserve older internal/external import paths during the structural migration. New production code must import the canonical owner path directly.

## Root Gateway wrappers

| Compatibility path | Canonical owner |
| --- | --- |
| `gateway/contract.ts` | `gateway/contracts/protocol.ts` + focused owner modules |
| `gateway/backend.ts` | `gateway/runtime/backend.ts` |
| `gateway/protocol.ts` | `gateway/contracts/protocol.ts` |
| `gateway/outputSchemas.ts` | `gateway/contracts/outputSchemas.ts` |
| `gateway/resultCompaction.ts` | `gateway/presentation/resultCompaction.ts` |
| `gateway/statusProjection.ts` | `gateway/presentation/statusProjection.ts` |
| `gateway/controlReceipt.ts` | `gateway/control/receipt.ts` |
| `gateway/capabilityManifest.ts` | `gateway/capabilities/manifest.ts` |
| `gateway/capabilityIntelligence.ts` | `gateway/capabilities/intelligence.ts` |
| `gateway/capabilityGraph.ts` | `gateway/capabilities/graph.ts` |
| `gateway/schemaProjection.ts` | `gateway/capabilities/schemaProjection.ts` |
| `gateway/capabilityEffects.ts` | `gateway/capabilities/effects.ts` |
| `gateway/connectionManager.ts` | `gateway/runtime/connectionManager.ts` |
| `gateway/reconnectPolicy.ts` | `gateway/runtime/reconnectPolicy.ts` |
| `gateway/recovery.ts` | `gateway/runtime/recovery.ts` |
| `gateway/runtimeSession.ts` | `gateway/runtime/runtimeSession.ts` |
| `gateway/projectAffinity.ts` | `lib/runtime/affinity.ts` |
| `gateway/localCapabilities.ts` | `gateway/providers/registry.ts` |
| `gateway/vanillaEntityReference.ts` | `gateway/providers/vanillaEntityReference.ts` |
| `gateway/runtime/projectAffinity.ts` | `lib/runtime/affinity.ts` |

## Control wrappers

| Compatibility path | Canonical owner |
| --- | --- |
| `gateway/control/registry.ts` | `contexts.ts` + `sourceOwners.ts` |
| `gateway/control/capabilityManifest.ts` | `capabilityProjection.ts` |
| `gateway/control/delta.ts` | `delta/engine.ts` + `delta/projection.ts` |

## Removal rule

Do not delete a wrapper only because repository production code no longer imports it. Remove it only after:

1. repository tests/import scans show no dependency on the old path;
2. local Gateway/Runtime validation passes;
3. no supported external setup/documentation still references the old path.

The structural test prevents new production dependencies on these wrappers. This keeps migration compatibility cheap without allowing compatibility files to become new implementation owners.

## Small helper rule

Do not centralize trivial local parser helpers such as `record(value)`, `stringValue(value)`, or narrow type guards solely to reduce line duplication. Centralize only when behavior and error semantics are truly identical across owners. A generic utility that couples unrelated layers costs more than a few local lines.