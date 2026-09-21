# MCP Package Rules

Applies to `mcp/**`. Root `../AGENTS.md` owns repository routing, execution-context definitions, proof economy, evidence labels, communication and general work discipline. This file keeps only MCP-specific implementation rules.

## Source Ownership

```text
index.ts                 plugin orchestration only
plugin/                  Runtime host, Blockbench integration, dev reload
server/net.ts            Runtime HTTP/MCP transport + serialization
server/runtime/          registration/surface/consolidation/phase/bootstrap
server/tools/            Geometry/Texture/Animation/Particle implementations
server/resources/        Runtime Resources
server/prompts.ts        Runtime Prompt registration
lib/                     shared schema/metadata/readiness/runtime helpers
ui/                      Blockbench UI implementation details
prompts/                 canonical prompt source + generated manifest
build/                   build/docs/prompt generation
scripts/                 verification/measurement/deploy utilities
tests/                   contract/integration regressions
docs/                    generated API docs; never hand-edit generated entries
```

Use the affected owner + direct callers first. `server/tools.ts` is a compatibility facade, never a Runtime-state owner.

## Execution Context / Proof Ceiling

Inherit root context/proof rules. MCP additions only:

- `REMOTE_GITHUB`: source/static/CI + live-harness preparation, never native/visual proof.
- `LOCAL_CODE`: generators, dependencies and local toolchain proof.
- `LIVE_BLOCKBENCH`: installed build identity, native Runtime/Undo/playback/persistence/export/lifecycle/visual proof.
- Runtime/plugin reload stays beneath the persistent Gateway; higher-context residue never transfers independent lower-context work.

## Public Boundary

Normal AI clients use the stable Gateway. Public tools remain exactly:

```text
status
search_capabilities
describe_capability
invoke_capability
```

No new public Gateway tools without an explicit product requirement. Runtime executes; Gateway owns client/recovery; Control owns routing/context projection.

## Tool Contract / Zero Capability Loss

Tool modules remain import-safe outside Blockbench:
- module scope exports exact Zod schemas/Tool specs and does not read Blockbench globals;
- registration/execution uses canonical factories/schema validation;
- annotations, deterministic identity and structured result semantics are preserved;
- Blockbench globals are runtime-execution only.

> **Capability/intelligence loss is forbidden as an efficiency technique.**

Never remove operations/branches, validation/defaults, native handling, recovery safety, domain intelligence or legitimate authored fields merely to reduce context.

Consolidation is routing-only:

```text
public capability → declarative route → retained original executor
```

Unknown branches fail explicitly; never silently fall back to a weaker executor.

## Identity / Mutation Safety

- Prefer UUID, then documented unique exact-name/ID fallback.
- Ambiguous destructive targets fail closed; never silently choose selection/first match.
- Reject provable destructive no-ops before Undo.
- Keep Runtime mutations serialized where required.
- Interrupted mutation with uncertain outcome is **not auto-retried**; inspect current authored state first.

## Result / Context Efficiency

`structuredContent` is canonical machine-readable state when available.

- Never mirror identical full JSON in `content.text`.
- Discovery/list stays summary-first; focused reads own detail.
- Reuse authoritative mutation receipts instead of confirmation rereads.
- Diagnostics stay optional/bounded.
- Reuse fresh content-addressed context; invalidate only superseded families.
- Keep Gateway/tool definitions stable where semantics are unchanged; dynamic task/state belongs in the dynamic tail.
- Optimize **Cost to Accepted Result**, not character/tool-count proxies.
- Do not remove capability/evidence merely to reduce payload.

Canonical context policy:
`../docs/04-system/ai-context-loading.md`,
`../docs/04-system/authoring-stage-context.md`,
`../docs/04-system/control/context-projection.md`.

## Capability Metadata / Effects

`lib/capabilityMetadata.ts` owns capability tier/search/effects. Transport must not grow capability-name special cases when declarative metadata can own behavior.

`lib/authoringPhase.ts` owns Geometry/Texturing/Animation classification. Do not create a second capability/phase table in Control/Gateway/Plugin.

## Runtime / Plugin Ownership

```text
server/net.ts                    transport + serialization + affinity/generation safety
server/runtime/registration.ts   catalog/surface/profile state
server/runtime/consolidatedRoutes.ts declarative branch→executor routes
server/runtime/consolidatedTools.ts  routing-only wrappers
server/runtime/phaseControl.ts   AUTHORING↔Animation handoff
server/runtime/bootstrap.ts      exactly-once intelligence wiring
server/tools/**                  domain implementations

index.ts                         plugin lifecycle orchestration only
plugin/runtimeHost.ts            listener/network lifecycle
plugin/blockbenchIntegration.ts  settings/UI/prompts/resources setup/teardown
plugin/devSync.ts                development watcher/reload only
```

Keep request-owned MCP reconstruction stateless/lightweight. Surface changes invalidate only caches whose semantics changed; setup/teardown stays idempotent.

## Validation / QA / Handoff

Technical validation and approval remain distinct.

```text
lib/authoringReadiness.ts  → USER_APPROVED | AUTONOMOUS_VERIFIED
lib/validationVerdict.ts   → BLOCKED | REVIEW_REQUIRED | VALIDATOR_CLEAR
```

`VALIDATOR_CLEAR`, internal quality PASS, tool/export success or numeric diagnostics never equal user approval/visual PASS. Control lifecycle readiness orients state; it does not authorize AUTHORING↔Animation by itself.

Load one active specialist per semantic owner; Geometry may add exactly one selected primary modelling profile. Do not load all profiles/stages as reassurance. Shared Stage Context is a semantic contract, not another router/manager.

## Generated Documentation / Prompts

Generated outputs are not authority.

```text
build/docs-manifest.ts → build/docs.ts → docs/api.json + docs/index.html
prompts/bedrock_entity_workflow.md → canonical generator → prompts/manifest.json
```

Never hand-edit generated API/prompt output. If the current context cannot run its generator, finish independent work and leave only generator-coupled residue for `LOCAL_CODE`. CI may verify/emit exact-SHA artifacts but is not the authoring path.

## Dependency Closure

Classify cross-surface dependents as `SHARED SOURCE | GENERATED | SEMANTIC MIRROR | CI ROUTING`; prefer shared source. Update operations docs only when proof/continuation changes.

## Test Ownership / Anti-Stale

Tests are evidence, not prose snapshots.

- Prefer imported behavior/schema/result/ownership assertions.
- Source-string assertions are fallback only; match stable semantics, not formatting.
- Keep one primary regression owner per recurring defect unless different layers prove different boundaries.
- If behavior is correct and a test encodes retired architecture, fix/remove the stale test rather than restoring old architecture.
- Merge weaker duplicate tests with no distinct failure mode.

```text
tests/*.test.ts            runtime/import-safe contracts
tests/authoring/*.test.ts  authoring semantics/policy
tests/repository/*.test.ts repository/docs/CI ownership
```

## Verification

During iteration run the smallest falsifying test. Broad/full verification is terminal evidence, not a ritual after every edit.

Typical final source gate from `mcp/`:

```bash
bun install --frozen-lockfile
bun run verify:full
```

Use narrower canonical scripts for narrower claims. Generated freshness uses its owning generator/checker.

## Security / Capability Boundary

- Keep Runtime/Gateway loopback-only with current Host/Origin protections.
- `risky_eval` and `from_geo_json` remain disabled.
- Do not broaden network exposure without separately reviewed authentication.
- No alternate transports, schema/server stacks, generic importers, routers/profiles/frameworks or parallel authored-state systems without a proved requirement.
- Keep dependencies lean; never commit secrets.
- Compatibility-bound BlockIT package/plugin/protocol/environment identifiers remain unchanged until separately dependency-mapped.

## Completion Rule

Remote completion = owner + direct dependents + regression intent aligned, with any genuine local/live residue stated accurately. Stop rather than inventing cleanup layers.
