---
name: lazydesigner-blockbench-development
description: Development specialist for LazyDesigner Blockbench runtime/plugin integration: lifecycle, Blockbench APIs/globals, UI, permissions, Undo/Canvas/model mutation mechanics, refresh and cleanup. Do not use for MCP public contracts, visual modelling judgement, normal asset/reference authoring, or Skill-system maintenance.
---

# LazyDesigner Blockbench Development

## Activation Contract

```text
LANE: DEVELOPMENT
DOMAIN: PRODUCT_DEVELOPMENT
CLASS: SPECIALIST
OWNER: BLOCKBENCH_RUNTIME_EXECUTION
```

Enter only when bounded evidence points to Blockbench runtime/plugin execution, lifecycle, API, Undo, UI, permission, refresh, or cleanup behavior. Do not enter for a merely poor-looking asset, an MCP public-contract defect, or Skill maintenance. Visual failure without runtime evidence remains with the active IN_USE specialist.


Own the **Blockbench runtime/plugin boundary** for LazyDesigner. This skill decides how an operation executes correctly inside Blockbench; it does not decide what a good model should look like.

## Use This Skill For

- `BBPlugin.register`, load/unload/install/uninstall lifecycle and cleanup;
- Blockbench panels, dialogs, settings, actions, and status/UI surfaces already used by Local;
- Blockbench globals/APIs such as `Cube`, `Group`, `Texture`, `Animation`, `Outliner`, `Settings`, `Canvas`, and `Undo`;
- model mutation mechanics: API call, lookup/selection, undo transaction, refresh/update, and cleanup;
- event subscription/unsubscription;
- runtime permissions and `requireNativeModule` behavior;
- Blockbench-specific behavior that requires live runtime proof.

Adjacent owners:

- MCP public/protocol contracts → `lazydesigner-mcp-development`;
- Bedrock model shape/proportion/reference/visual judgement → `lazydesigner-modelling`;
- Reference Preparation policy → `docs/02-reference/policy.md`;
- TypeScript/Bun compiler/build/package mechanics → exact affected source/build owner under `mcp/AGENTS.md`.

If an MCP tool calls Blockbench APIs, choose by the **proved semantic owner**: public MCP contract → MCP specialist; correct contract but wrong Blockbench operation/lifecycle → this skill; operation works but the model is visually wrong → modelling specialist. Ordinary TypeScript/Bun correctness stays with the same implementation owner instead of creating another routing hop.

## Local Architecture First

Typical owners:

- `mcp/index.ts` for plugin lifecycle/permissions/startup/teardown;
- `mcp/ui/` for panels/dialogs/settings/status/cleanup;
- affected `mcp/server/tools/*.ts` execute path for live model mutation;
- `mcp/types.d.ts` / installed `blockbench-types` when runtime typing matters;
- existing Local usage of the same API before another pattern is introduced.

Local source, installed typings, and live Blockbench behavior are stronger runtime authorities than copied plugin/Vue/API cheat sheets.

## Runtime Contract

For a Blockbench-owned change establish only:

1. the runtime API/lifecycle owner;
2. required state before mutation;
3. the mutation/undo boundary;
4. required refresh/update/cleanup;
5. failure behavior when target/state/permission is unavailable.

Do not add speculative fallbacks because an API is uncertain. Resolve the API or leave the exact local proof outstanding.

## Mutation And UI Rules

- Use existing Local `Undo` patterns for user-visible reversible model changes.
- Match undo scope to the actual mutation.
- Refresh Blockbench state only as required.
- Reuse current ID/name/selection lookup conventions.
- Keep Blockbench globals out of build-time schema construction; live-state validation belongs in execution.
- Pair listeners/subscriptions and UI resources with the proper teardown path.
- Reuse existing `uiSetup`/`uiTeardown`, settings, dialog, status, and `Panel` component patterns before adding another state/framework layer.
- Treat embedded reactive component behavior as Blockbench runtime integration, not a standalone Vue application architecture.
- Do not introduce SFC/Composition API/Pinia/router/Volar/vue-tsc architecture unless a new product requirement explicitly creates that boundary.
- Permission-sensitive native modules must follow the existing Blockbench permission path.

Correct mechanics do not prove good modelling. A technically valid Cube mutation can still produce the wrong visual result.

## Proof

Apply root `AGENTS.md` minimum-proof rules. `REMOTE_GITHUB` can inspect runtime owners and consistency but cannot claim live Blockbench execution. `LIVE_BLOCKBENCH` should use the smallest live reproduction that can falsify the changed runtime behavior, such as one load/unload, one changed operation plus undo, or one specific UI interaction.

## Anti-Slop Boundary

- Do not load this skill merely because source references a Blockbench global.
- Do not turn API mechanics into modelling policy.
- Do not infer visual quality from successful Undo/Canvas/element/save behavior.
- Do not import generic plugin/Vue scaffolding into the existing plugin.
- Do not add abstractions around a one-off API without repeated Local behavior.
- Do not create a separate language/build skill for ordinary TypeScript or Bun mechanics.

## Completion

Return to the active development route and confirm the runtime/API problem is fixed at its real owner, adjacent domains stayed outside scope, undo/update/cleanup are appropriate, and unavailable live proof is reported rather than inferred.
