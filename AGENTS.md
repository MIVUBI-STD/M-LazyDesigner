# Workspace Agent Routing

User-authorized autonomy replaces approval waits with verified checkpoints; never claim user approval.

## Instruction priority

- Current user intent takes precedence over workflow guidance in `AGENTS.md` and Skills; repository safety/integrity rules and actual capability limits still apply.
- Do not invent approval gates; explain any rule that materially blocks an authorized action.

## Branch and boot

- `Local` is working authority; `main` changes only on explicit user request.
- Material GitHub work follows `GITHUB_RULES.md`.
- Canonical documentation starts at `docs/README.md`; select one domain before loading deeper docs.

## Execution Context Gate

Classify by **actual capability**, not product/UI name:

```text
CONTEXT: REMOTE_GITHUB
CONTEXT: LOCAL_CODE
CONTEXT: LIVE_BLOCKBENCH
SWITCH CONTEXT: <REMOTE_GITHUB | LOCAL_CODE | LIVE_BLOCKBENCH>
```

A marker is intent, not proof. Without a marker, choose the lowest sufficient provable context. Never infer `LOCAL_CODE` from “Codex”; never infer `LIVE_BLOCKBENCH` from mentioning Blockbench. `LIVE_BLOCKBENCH` is never assumed.

```text
REMOTE_GITHUB   = GitHub repository + CI; no local worktree/Bun/installed Blockbench
LOCAL_CODE      = local checkout + Bun/tests/build/generators/filesystem
LIVE_BLOCKBENCH = LOCAL_CODE + deployed LazyDesigner runtime + functioning Gateway/runtime connection
```

Proof ceiling follows actual context; exact-commit source acceptance follows `GITHUB_RULES.md`.

```text
REMOTE_GITHUB → exhaust source/static/CI-verifiable work first
higher-context dependency → partition; prepare independent tests/harness/evidence here
handoff only the minimum higher-context residue
never transfer the whole task because one residue needs more capability
covered source result complete → accept CI proof; label only genuinely missing higher-context proof
```

### Observe / recover context

For read-only `amati`, inspect, audit, or recovery:

```text
AGENTS.md → GITHUB_RULES.md Core Rules
→ smallest owner/evidence that can answer the question
→ CONTEXT.md / docs/05-operations/next-action.md only when prior state is material
→ report → STOP
```

### Repository / Plugin Work

```text
AGENTS.md → GITHUB_RULES.md Core Rules → EXECUTION CONTEXT
→ Bounded | Standard | Complex
→ nearest AGENTS.md + exact owner
→ only evidence/continuity that can change the decision
```

#### Development Execution Gate

**Bounded contract**
```text
Goal
Failure Classification / first wrong owner
Acceptance
Proof Required
STOP Condition
```

**Standard contract**
```text
Goal
Success Metric
Forbidden Proxy / Non-Goal
First Evidence Required / first wrong owner
In Scope / Out of Scope
Execution Partition / higher-context residue
Proof Required
STOP Condition
```

### Bounded Maintenance

Concrete bug, stale rule/test, CI routing defect, or behavior-preserving cleanup starts at the exact owner. Do not load `lazydesigner-development-brief` merely because source code is involved.

### Standard Development

Use when requirement and owner are clear but work exceeds bounded maintenance. Finish the GitHub-verifiable partition before escalating generator/filesystem/native residue.

### Complex / Ambiguous Development

Use `.agents/skills/lazydesigner-development-brief/SKILL.md` only when architecture, cross-owner ambiguity, unresolved success criteria, or a material unknown prevents a reliable standard contract. A clear optimization request does not become Complex merely because quality or efficiency matters.

## Task Class After Context

### Reference Preparation

Reference generation belongs in **ChatGPT** using `.agents/skills/lazydesigner-reference-preparation/SKILL.md`. Codex authoring consumes the actual user-approved/usable reference artifact or package; it does not recreate the reference workflow.

Use `docs/02-reference/README.md` as the Reference domain index. First classify the required capability, then load only that branch:

```text
smooth concept / turnaround / model reference
→ image reference branch

strict integer-grid icon / sprite / tile / pixel-art conversion
→ .agents/skills/lazydesigner-pixel-art-authoring/SKILL.md
→ docs/02-reference/pixel-art/

Bedrock / Snowstorm particle or VFX artifact
→ .agents/skills/lazydesigner-particle-reference-authoring/SKILL.md
→ docs/02-reference/particle/
```

Generate only minimum useful evidence. For smooth image/model references, Sheet 01 is the identity/scale anchor; Sheet 02+ exists only for real information overflow. Do not force fixed turnaround boards or extra views when they do not reduce downstream uncertainty.

Do not route an actual Blockbench atlas/UV/Painter task to Pixel Art merely because the desired texture is pixel-styled. Actual mapped texture production remains `lazydesigner-texturing`. Pixel Art may supply an approved image/style artifact to Texturing or a particle texture to Particle without taking over their ownership.

### Asset Authoring

LazyDesigner Control is the canonical routing/context authority. There is no separate asset-router Skill in the normal authoring path.

Before an authoring mutation, use the current Control packet when orientation/context is unknown or materially stale:

```text
current AGENTS.md
→ LazyDesigner Control
→ active stage context + content-addressed required handles
→ exactly one active specialist

Geometry / rig / pivots / UV Layout
→ .agents/skills/lazydesigner-modelling/SKILL.md
→ exactly one selected modelling profile when Control provides it

Texture Atlas / Styling / PBR / Texture Verify
→ .agents/skills/lazydesigner-texturing/SKILL.md

Animation / motion
→ .agents/skills/lazydesigner-animation/SKILL.md
```

Do not preload sibling specialists or all profiles. Load a new specialist only when semantic ownership changes. Reuse unchanged `known_context_ids` rather than retransmitting the same Skill/profile content.

Control readiness is not user approval. Persisted Workspace lifecycle remains:

```text
Geometry
→ author + verify
→ Geometry APPROVED
→ UV Layout PASS

Texturing
→ requires Geometry APPROVED + UV Layout PASS
→ author + verify
→ Texturing APPROVED

Animation
→ requires valid upstream gates + Texturing APPROVED
→ AUTHORING↔Animation handoff through Gateway
```

Geometry↔Texturing use the shared AUTHORING Runtime Surface. Animation remains the only Runtime Surface handoff boundary. In new prose and semantics use `Stage` for GEOMETRY/TEXTURING/ANIMATION; treat existing `phase` field/tool names as compatibility identifiers.

Hot path:

```text
approved Reference Package + current user delta
→ Control active stage/context
→ exact known Runtime capability
→ mutate
→ reuse returned state + control_delta
→ minimum evidence that can change the verdict
```

Use `status` only when orientation is unknown/materially stale, after project/phase authority changes, or when Control explicitly requires reorientation. Search is fallback for unknown/stale capability identity; describe is fallback for real schema uncertainty. Do not use status/search/describe as progress-confirmation ceremony.

For normal asset authoring, do not automatically load repository continuation/history/all docs, scan source/tests/CI, or run development verifiers. Asset authoring is not software **Development**; do not route it through `lazydesigner-development-brief` unless repository/plugin behavior changes.

At `FINALIZATION`, load only `docs/03-authoring/finalization/standard.md`; do not load it during earlier authoring stages.

## GitHub Work

`GITHUB_RULES.md` owns branch/ref, GitHub-first partitioning, transfer, atomic delivery, CI/security, retries, and STOP.

## Source Precedence

current user → current source/proof → nearest `AGENTS.md` → Control-projected active specialist/context → selected canonical doc owner under `docs/` → operational continuity only when material → history.

## Work Discipline

- Fix the minimum complete owner; no fallback/framework/profile layers without evidence.
- Reuse fresh returned state; do not add reassurance reads or progress checks.
- Stop the same failed direction after two attempts without new evidence.
- `No change required` is valid; never claim proof above the context ceiling.
- **Authoring Efficiency** = cost to accepted result; **Static Footprint** = guardrail only.

```text
CURRENT-PROJECT VERIFIED
OFFICIALLY VERIFIED
LOCAL PROOF REQUIRED
UNSUPPORTED
UNKNOWN
```

## Product Boundary

LazyDesigner authors Bedrock visual assets, not Minecraft add-on development. `bedrock` remains default; `mcp/AGENTS.md` owns `mcp/**`.

## Canonical Owners

```text
documentation entry point → docs/README.md
product/flow              → docs/01-product/
reference preparation     → docs/02-reference/
asset authoring           → docs/03-authoring/
system/ownership          → docs/04-system/
current operations        → docs/05-operations/
asset continuity          → workspace/active/<project>/README.md
stable project facts      → CONTEXT.md
GitHub execution          → GITHUB_RULES.md
research                  → experiments/
```

Do not create duplicate navigation, review archives, decision logs, roadmaps, or parallel state systems.

## Repository Top-Level Discipline

Keep the root sparse and deterministic for Codex navigation.

Allowed top-level domains are `.agents/`, `.github/`, `apps/`, `docs/`, `mcp/`, `workspace/`, and `experiments/`, plus repository-wide entrypoint/governance/toolchain files.

Do not add top-level feature, generated, fixture, benchmark, archive, temporary, or per-asset directories. Put them under the canonical owner.

Naming:
- directories use lowercase kebab-case;
- one semantic concept has one canonical name;
- aliases exist only for compatibility and must be explicitly identified as such;
- new documentation must extend an existing owner rather than create a parallel owner.
