# LazyDesigner Canonical Vocabulary

Updated: 2026-09-29

This file owns **product vocabulary only**. It prevents multiple names from describing the same concept and prevents one name from carrying unrelated meanings.

The rule is strict:

~~~text
one concept → one canonical term
legacy serialized identifier → compatibility boundary only
~~~

Do not create synonyms for style. Prefer the canonical term even when another word sounds natural.

## Canonical Terms

| Concept | Canonical term | Meaning |
| --- | --- | --- |
| top-level kind of work | **Task Class** | `ASSET_AUTHORING` or `SYSTEM_DEVELOPMENT` |
| current semantic authoring position | **Stage** | `GEOMETRY`, `TEXTURING`, `ANIMATION`, `FINALIZATION` |
| currently exposed Runtime capability family | **Runtime Surface** | `AUTHORING` or `ANIMATION` |
| semantic specialist ownership | **Domain** | Geometry, Texturing, Animation, or Core ownership; not lifecycle position |
| executable MCP operation | **Capability** | one discoverable/invocable operation |
| stable AI-client MCP boundary | **Gateway** | transport/catalog/recovery boundary; not workflow reasoning |
| Blockbench-facing executor | **Runtime** | capability registration, validation and execution |
| deterministic task/context projector | **Control** | intake, selection, projection, invalidation and continuation |
| optional local lifecycle application | **Desktop Manager** | install/health/launch/update/repair/recover sidecar |
| source/user material used to decide what to build | **Reference Evidence** | text/images/requirements before packaging |
| normalized Codex/LazyDesigner handoff artifact | **Reference Package** | compact machine-readable handoff; required only when downstream handoff needs it |
| current durable asset continuation | **Asset State** | current Stage/gates/next step for one asset |
| result of a mutation | **Mutation Receipt** | structured evidence returned by an authored change |
| semantically invalidated dependency | **Dirty Scope** | evidence that must be re-established after a material change; downstream ownership/recheck semantics come from the Asset Dependency Graph |
| technical/evidence check | **Validation** | evaluates a bounded property; never implies user acceptance |
| explicit human acceptance | **Approval** | user acceptance of the current revision |
| permission to cross a gated boundary | **Transition Eligibility** | prerequisite result for Stage/Runtime Surface transition |

## Stage vs Runtime Surface

These are intentionally different.

~~~text
Stage GEOMETRY  ─┐
Stage TEXTURING ─┴→ Runtime Surface AUTHORING

Stage ANIMATION ───→ Runtime Surface ANIMATION
~~~

Geometry↔Texturing is a **Stage change inside the same Runtime Surface**.

AUTHORING↔Animation is a **Runtime Surface transition**.

Do not describe Geometry↔Texturing as a Runtime phase transition, reload, or handoff.

## Validation vs Approval

Never use bare `PASS` as a complete semantic statement.

A validation result must identify what was checked, for example:

~~~text
UV Layout: PASS
Geometry visual validation: PASS
Animation playback validation: PASS
~~~

`PASS` means the named check passed. It never means user approval.

~~~text
Validation → technical/evidence result
Approval   → explicit user acceptance
~~~

Persisted legacy gate strings such as `UV Layout: PASS` remain valid because the subject is explicit.

## Readiness Vocabulary

Avoid unqualified `readiness` in new prose.

Use the specific concept:

~~~text
Stage Readiness
→ required reference/input evidence for the active Stage is sufficient

Transition Eligibility
→ prerequisites for moving to another gated Stage/Runtime Surface are satisfied

System State
→ READY | DEGRADED | OFFLINE for Runtime/Gateway availability
~~~

Existing protocol fields named `readiness` remain compatibility contracts until a separately mapped migration.

## Reference Boundary

Reference creation and Reference Package creation are not the same operation.

~~~text
standalone reference task
→ Reference Evidence / approved reference artifact
→ STOP

downstream Codex/LazyDesigner authoring requested
→ Reference Evidence
→ compact Reference Package
→ Control
~~~

Do not package merely to satisfy a template. When downstream authoring is requested, package creation is part of that handoff and does not require a second ceremonial request.

## Compatibility-Only Vocabulary

The following names may remain in source, settings, headers, schemas or public capabilities because they are compatibility-bound:

~~~text
mcp_authoring_phase
x-blockit-authoring-phase
switch_authoring_phase
McpAuthoringPhase
phaseAffinity
phaseTransitionReceipt
~~~

Their semantic interpretation is:

~~~text
legacy phase value geometry|texturing|animation
→ Authoring Stage

phase affinity / switch crossing AUTHORING↔ANIMATION
→ Runtime Surface transition
~~~

Do not introduce new product concepts named `phase`. Do not bulk-rename compatibility identifiers.

## Avoided Ambiguous Terms

Do not create new product architecture around these generic names:

~~~text
core
manager
director
router
handler
helper
mode
phase
generic PASS
generic readiness
~~~

Exceptions require a concrete existing compatibility contract or a clearly qualified technical meaning. `Desktop Manager` is the canonical qualified name for the optional machine lifecycle sidecar.

## AI Efficiency Rule

Vocabulary is part of the token-efficiency contract.

When the current Stage, Runtime Surface, Capability and Dirty Scopes are known:

~~~text
do not rediscover them
do not restate synonyms
do not translate them into alternate internal names
do not run status/search/describe as reassurance
~~~

Control projects current state; Codex reasons once; Runtime executes; Mutation Receipts identify Dirty Scopes; the deterministic Asset Dependency Graph maps those scopes to the minimum downstream rechecks.

## Ownership

~~~text
canonical vocabulary          → this file
product sequence              → ../01-product/flow.md
context-loading policy        → ai-context-loading.md
Stage cross-context semantics → authoring-stage-context.md
source ownership              → implementation-map.md
legacy serialized identifiers → compatibility-identifiers.md
~~~
