# Core Capability Metadata

`manifest.ts` is the canonical owner for capability-level metadata shared across Runtime and Gateway:

- tier;
- aliases;
- named phase ownership;
- execution class;
- verification class;
- lifecycle overrides;
- affinity/catalog effects.

`lib/capabilityMetadata.ts` is a compatibility adapter and must not regain parallel allowlists. `lib/authoringPhase.ts` may keep family-based fallback classification, but named capability ownership is projected from this manifest.

Branch-level routing data belongs in `gateway/capabilities/manifest.ts`.
