# LazyDesigner Control

Canonical front-line intake, context projection, routing metadata, and continuation-delta layer for the stable four-tool Gateway.

```text
user task
→ Control intake
→ Reference Package / Workspace / Runtime orientation
→ stage or development projection
→ minimum canonical context
→ Gateway capability
→ Runtime
→ Blockbench
→ control_delta
→ deterministic continuation action
```

## Ownership

Control owns:
- `ASSET_AUTHORING | SYSTEM_DEVELOPMENT` task classification;
- project/runtime/workspace orientation needed for routing;
- Reference Package projection;
- `GEOMETRY_CONTEXT | TEXTURE_CONTEXT | ANIMATION_CONTEXT`;
- content-addressed Skill/profile handles;
- bounded source/specialist/test ownership for system development;
- capability-domain metadata;
- mutation invalidation and next-intent delta.

Control does not own:
- user/reference truth;
- Skill prose or modelling knowledge;
- Tool schemas/implementation;
- persistent asset state;
- Blockbench live state;
- Codex creative/technical reasoning.

## Canonical source

```text
types.ts              compact Control contracts
referenceTypes.ts     REFERENCE.json projection contracts
referenceParser.ts    pure REFERENCE.json normalization
referencePackage.ts   REFERENCE.json filesystem/cache boundary
workspace.ts          Active Workspace projection
contextProjection.ts  stage-specific authoring context
contexts.ts           Skill/profile paths + content-addressed context handles
sourceOwners/         domain-scoped capability source-owner maps\nsourceOwners.ts        source-owner composition + fallback
registry.ts           compatibility facade
snapshot.ts           live Gateway/Runtime orientation
packetContext.ts      task identity + context delivery/cache semantics
readiness.ts          lifecycle/readiness policy
packetData.ts         empty workspace + packet summaries
packet.ts             task packet orchestration
capabilities.ts       capability decoration
routingPolicy.ts      direct-first route policy
developmentIntent.ts  bounded SYSTEM_DEVELOPMENT routing
capabilityProjection.ts Control-only projection of canonical capability metadata
delta/                post-operation freshness/invalidation engine + Gateway projection
delta.ts              compatibility facade
orchestration.ts       ephemeral execution reducer + deterministic next action
index.ts              public module exports
```

## Context economy

Geometry normally receives:

```text
Modelling Skill
+ exactly one selected profile when available
```

Texturing and Animation receive only their active specialist by default. Unchanged context is reused by content-addressed handle; Control does not load the old router Skill or all sibling domains as reassurance.

Research-derived authoring guidance stays in canonical authoring docs, the active specialist, and the selected Geometry profile. Control must not add duplicate stage-context fields or prose for ownership-reuse, variant, Locator-parent-motion, family-rig, or rig/clip/controller rules.

## Reference boundary

`REFERENCE.json` stays the structured reference authority. Control selects only active-stage document/image identities and preserves:

```text
original_user_intent
current_user_delta
selected_profile
scale requirements
stage readiness
workspace revision
```

A stage is blocked by its own readiness, not by unrelated future-stage unknowns.

## Delta boundary

`control_delta` invalidates only evidence that can be affected by the mutation when Runtime evidence is sufficient. Ambiguous structural mutation evidence fails conservatively. Ordinary mutation does not force a full `status` reread; project/phase authority changes may require one.

## Orchestration boundary

The Gateway keeps one **ephemeral** execution reducer. It does not persist asset
truth or chat history. After an attached mutation delta, the reducer derives one
bounded continuation action:

```text
CONTINUE | STATUS | RECOVER | HANDOFF
VERIFY_FOCUSED | VERIFY_VISUAL | REVIEW_RETURNED_EVIDENCE
```

This converts verification class, phase/project changes, particle-texture
handoff, and unknown outcomes into deterministic flow policy without another
LLM/planner call. Unknown mutation outcomes never become automatic retries.

Control consumes canonical capability metadata from `mcp/lib/capabilities/manifest.ts` through `capabilityProjection.ts`. Branch-level AI routing metadata remains owned by `gateway/capabilities/`; Control adds context/freshness/orchestration semantics without rebuilding those tables.

## Gateway boundary

The client-facing surface remains exactly:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Control is internal to this stable Gateway boundary; it is not a second MCP server or public tool family.

## Proof boundary

Source structure and static contracts can prove ownership/routing semantics. Installed Runtime behavior, live Blockbench state, visual quality, and measured end-to-end usage reduction require later local/live evidence.
