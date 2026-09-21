# Parametric Authoring Engine

Status: G0-G2 SOURCE FOUNDATION
Updated: 2026-09-21
Branch: `Local`

## Goal

Replace repetitive coordinate-by-coordinate Blockbench authoring with:

```text
intent / compact parameters
→ recipe
→ deterministic lightweight instances
→ compile affected output
→ one bounded transaction
→ verification
```

This is not a visual node editor and does not replace the Builder Engine.

## Proof Rule

The engine must not be called faster or cheaper merely because it is procedural.

REMOTE_GITHUB may prove deterministic compilation, fewer serialized authoring bytes for repeated structures, fewer required mutation batches as a static call proxy, fewer authored coordinate literals, exact realized Cube count, finite geometry, and bounded affected-scope contracts.

LOCAL_CODE must measure compile wall-clock, memory/GC, recipe-vs-explicit realization time, and incremental rebuild cost.

LIVE_BLOCKBENCH must measure native transaction latency, viewport/UI responsiveness, actual Undo/Redo behavior, accepted-result quality, and correction rounds.

Provider/client telemetry is required for actual model-token claims.

## Core Principle

Keep repetition as lightweight recipe/instance data until final realization. Do not eagerly duplicate Cube payloads during planning.

## Architecture

```text
AuthoringRecipe
├── prototypes
├── patterns
├── constraints      G3+
└── semantic groups
        ↓
Pattern expansion
        ↓
lightweight RecipeInstance[]
        ↓
Recipe compiler
        ↓
CompiledCubePlacement[]
        ↓
dry-run metrics / diff
        ↓
native adapter       future
        ↓
one Undo transaction
```

Core stays data-only; Blockbench globals belong only to the future adapter.

## G0 — Contracts + Proof

Implemented: versioned recipe contract, Cube prototypes, lightweight instances, compiled placement contract, static efficiency comparison, deterministic repeated-structure benchmark.

Current benchmark basis:

```text
serialized payload bytes
numeric authoring parameter count
minimum manage_cubes batch count
planned recipe transaction count
exact output Cube count
finite geometry
determinism
```

Serialized bytes are a context/payload proxy, not model token telemetry.

## G1 — Anchors / Constraints

SOURCE IMPLEMENTED with one composable ANCHOR primitive.

ANCHOR expresses source/target anchors per axis plus optional offset. This covers the common high-value cases:

```text
ALIGN
CENTER
FLUSH
OFFSET
ATTACH
```

The solver is dependency-aware, deterministic, detects cycles, and rejects conflicting axis claims.

FIT_BETWEEN, MATCH_SIZE and explicit KEEP_DISTANCE remain future extensions only when a concrete component workload requires them.

Constraints express relationships. AI should not solve absolute coordinates when the relationship is the durable fact.

## G2 — Pattern Engine

SOURCE IMPLEMENTED: LINEAR, GRID, RADIAL. Patterns remain lightweight until compile.

Mirror is intentionally deferred because symmetry needs explicit semantic counterpart/handedness ownership rather than a naive negative-coordinate copy.

## G3 — Symmetry Relationships

Planned: left-right semantic counterpart, mirror plane, name transformation, geometry transform, UV sharing/uniqueness policy, rig counterpart, texture counterpart.

## G4 — Parametric Components

A component combines prototype set, anchors, constraints, patterns, and semantic roles. Examples include wheel, shelf bay, window module, chair leg set, and panel bank.

## G5 — Incremental Rebuild

Changing one parameter must recompile only dependent recipe nodes/components. No global rebuild if dependency evidence says unaffected outputs remain valid.

## Efficiency Acceptance

For repeated-structure fixtures, source-level G0 acceptance requires deterministic result, exact expected Cube count, finite geometry, recipe serialized payload smaller than explicit Cube payload, at least 25% byte reduction on representative repeated fixtures, and fewer static mutation batches when realized Cube count exceeds the current 32-Cube batch limit.

These prove structure/context efficiency only. Wall-clock superiority remains unclaimed until LOCAL_CODE.

## Stop Rules

Do not build a generic Houdini clone, add a visual node UI before recipe semantics are stable, duplicate Builder Engine ownership, realize every instance during intermediate planning, make hidden global rebuild the default, use AI to generate hundreds of explicit coordinates when a pattern/constraint describes the same intent, or claim token/wall-clock savings from byte proxies alone.

## Current Remote Benchmark Evidence

Exact-SHA CI fixtures currently show:

```text
shelf_24_boards
explicit payload 2603 B → recipe 264 B
payload proxy reduction ≈ 89.9%
static mutation batches 1 → 1

panel_grid_10x10
explicit payload 10227 B → recipe 272 B
payload proxy reduction ≈ 97.3%
static mutation batches 4 → 1

radial_64_spokes
explicit payload 12688 B → recipe 282 B
payload proxy reduction ≈ 97.8%
static mutation batches 2 → 1
```

These are repository-owned serialized-byte and static operation proxies. They do not prove wall-clock, memory, provider token, or accepted-result superiority.

The benchmark is now a permanent MCP Verify gate and fails if representative repeated fixtures lose >25% payload reduction, determinism, finite geometry, exact output count, or large-output batch reduction.
