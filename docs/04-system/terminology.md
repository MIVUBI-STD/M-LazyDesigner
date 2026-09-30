# Canonical Terminology

Use one canonical term for each architectural concept.

| Term | Meaning | Canonical owner |
| --- | --- | --- |
| **Stage** | semantic authoring state: Geometry, Texturing, Animation | `lib/capabilities/authoringStage.ts` |
| **Runtime Surface** | executable tool surface: AUTHORING or ANIMATION | `lib/capabilities/authoringStage.ts` |
| **Registration Profile** | runtime family exposure policy such as `bedrock_entity` / legacy `extended` | `lib/capabilities/registrationProfile.ts` |
| **Capability** | AI-facing semantic operation discoverable/invokable through Gateway | `lib/capabilities/manifest.ts`, `gateway/capabilities/` |
| **Tool** | concrete MCP Runtime registration/executor implementation | `server/tools/` |
| **Runtime** | Blockbench-side execution system behind Gateway | `server/runtime/`, `server/net.ts` |
| **Gateway** | stable four-tool AI-client boundary and Runtime recovery layer | `gateway/` |
| **Control** | context/readiness/source-routing projection inside Gateway | `gateway/control/` |

## Compatibility vocabulary

The following names remain only where external or serialized compatibility requires them:

- `phase`, `authoring_phase`, `target_phase`, `switch_authoring_phase`;
- `phaseAffinity` and compatibility headers/settings;
- legacy `McpAuthoringPhase` aliases;
- compatibility-bound BlockIT package/plugin/protocol identifiers.

New internal implementation, documentation, and variable names should use **Stage** rather than **Phase** unless referring to one of those compatibility contracts.

Do not use **Profile** as a synonym for Stage or Runtime Surface.
Do not use **Tool** as a synonym for Capability.
Do not use **Runtime** to mean Gateway or Control.
