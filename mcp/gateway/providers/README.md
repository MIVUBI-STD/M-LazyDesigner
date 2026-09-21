# Gateway Providers

This folder owns Gateway-local capabilities that do not come from the Blockbench Runtime catalog.

- `registry.ts` — local provider registry and merge order with Runtime search results.
- `vanillaEntityReference.ts` — optional read-only vanilla Bedrock entity reference provider.

Root files `gateway/localCapabilities.ts` and `gateway/vanillaEntityReference.ts` are compatibility re-exports only. New Gateway-local providers belong here and must remain lazily probed so they do not inflate normal AI context.
