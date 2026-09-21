# Texture Compute + AI Usage Efficiency Audit

Updated: 2026-09-21  
Branch authority: `Local`  
Context: `REMOTE_GITHUB`

## Purpose

This document is the deep audit owner for two coupled optimization problems:

1. **Texture Compute efficiency** — CPU, memory, bitmap passes, intermediate allocations, palette lookup, diagnostics, region scope, verification, and transaction cost.
2. **AI usage efficiency** — static model context, Gateway search/describe payloads, tool-result continuation payloads, specialist/context duplication, redundant reads, and call count to accepted result.

The goal is not minimum characters or minimum calls. The goal is:

```text
lowest Cost to Accepted Result
while preserving:
- capability
- reference fidelity
- mutation safety
- recovery semantics
- decision-changing verification
- user approval boundaries
```

Do not report byte proxies as provider token counts or static source tests as native Blockbench latency proof.

---

# 1. Current Architecture Baseline

## 1.1 Stable model-facing Gateway

Public Gateway remains exactly:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Do not add a fifth public Gateway tool for optimization.

Routing policy:

```text
known capability
→ invoke directly

unknown/stale capability identity
→ bounded search

real schema uncertainty
→ focused describe

fresh authoritative mutation result
→ continue from receipt/control_delta

decision-changing visual uncertainty
→ refresh only affected evidence
```

## 1.2 Texture mutation owner

`paint_texture_transaction` remains the deterministic bitmap mutation owner.

It owns:

- expected full-texture revision precondition;
- exact-pixel / compute / AO exclusivity;
- one Undo boundary;
- dirty-region canvas write;
- full postcondition revision proof;
- bounded affected-region visual evidence;
- optional verified PNG output.

Do not create a second texture mutation framework.

## 1.3 Texture Compute

Current compute capabilities include:

- Oklab / OKLCh color math;
- generated shade ramps;
- nearest / blended / ordered gradient map;
- palettize;
- Bayer dithering;
- Floyd–Steinberg palette diffusion;
- median-cut palette extraction;
- auto levels;
- lightness posterize;
- spatial gradients;
- height-field extraction;
- Sobel gradient;
- directional shading;
- adaptive step rewrites / no-op removal;
- request-local color/palette caches.

This is sufficient feature breadth for the current phase. **Do not prioritize more filters until the executor architecture below is fixed.**

---

# 2. What Is Already Hardened

## Texture / Runtime

Already implemented and should not be redone without evidence:

- `list_textures()` is inventory-only by default.
- Diagnostics are explicit and scoped.
- Coverage/seam/PBR share request-local diagnostic reads.
- Diagnostic native-pixel work has a bounded invocation ceiling.
- Exact-pixel brush path bypasses native Painter UI state.
- Deterministic texture mutation does not select/activate texture unnecessarily.
- `paint_texture_transaction` writes only the dirty canvas region.
- Affected-region evidence does not perform a third full-atlas read.
- `fullTextureRgba()` avoids a redundant copy of the ImageData buffer.
- Explicit `layer_id` replaces global selected-layer dependence.
- Layer Undo is action-scoped.
- Layer metadata cohorts support one coherent transaction.
- Native flatten semantics fail closed rather than using an inaccurate fallback.
- Selection morphology no longer uses the old radius-squared brute-force path.

## AI / Gateway

Already implemented:

- direct-first routing;
- search default = 4 results;
- search hard cap = 8;
- search returns bounded hints rather than full descriptions;
- describe defaults to input-schema-only;
- `detail=full` is explicit for metadata-heavy describe;
- branch-specific schema projection exists for selected consolidated capabilities;
- read-only/mutation text mirrors are compacted when structured data is authoritative;
- complete receipts suppress confirmation rereads;
- Control stage projection is headroom-bounded;
- continuation checkpoints are smaller than full internal Control state;
- repo-owned static context, dynamic workflow bytes, and continuation bytes are measured separately.

---

# 3. Measured AI Context Baseline

These are deterministic serialized-byte proxies, **not actual model token billing**.

Historical baseline before the latest Gateway/context cleanup:

```text
common repo-owned prefix      22,133 bytes
texturing authoring prefix    35,399 bytes
```

After safe static-context deduplication and Gateway prose compaction:

```text
common repo-owned prefix      21,492 bytes
texturing authoring prefix    34,758 bytes
```

Delta:

```text
common prefix                 -641 bytes (~2.9%)
texturing authoring           -641 bytes
```

Representative dynamic progressive-disclosure proxy:

```text
capability search projection  materially reduced by bounded hints
describe input-only           materially smaller than full metadata describe
```

Canonical measurement owners:

```text
mcp/scripts/measure-model-context-footprint.ts
mcp/scripts/measure-astra-context.ts
mcp/scripts/benchmark-zero-waste-total-context.ts
mcp/scripts/measure-mcp-efficiency.ts
mcp/scripts/evaluate-routed-tool-loading.ts
mcp/scripts/evaluate-codex-session-policy.ts
```

Actual token claims require provider/client telemetry:

```text
input_tokens
cached_input_tokens
cache_missed_tokens
reasoning_tokens
output_tokens
accepted-result quality
user correction count
```

---

# 4. Deep Compute Audit — Remaining Waste

## P0.1 — No Region-of-Interest Compute

### Current problem

Compute still receives the full atlas even when intent is local.

Example:

```text
atlas     = 1024 × 1024 = 1,048,576 pixels
target    = 16 × 16     = 256 pixels
area gap  = 4096×
```

A local texture correction can therefore pay full-atlas cost.

### Required final form

Internal compute plan must own an ROI:

```text
target rect
→ required halo
→ bounded source window
→ compute only bounded window
→ write target rect
```

Pointwise operations:

```text
halo = 0
```

Sobel 3×3:

```text
halo = 1
```

Radius-based local filters:

```text
halo = filter radius
```

ROI should remain Runtime-owned. Do not add a large new public tool family merely to expose it.

### Acceptance

- small ROI does not traverse the whole bitmap;
- spatial kernels receive correct halo;
- dirty bounds are exact;
- full revision safety remains unchanged.

---

## P0.2 — Pointwise Pass Fusion Missing

### Current problem

A pipeline such as:

```text
auto_levels
→ posterize
→ gradient_map
→ nearest palettize
```

still tends toward multiple full-image passes and intermediate RGBA buffers.

### Required final form

Compile compatible pointwise steps into one kernel:

```text
source RGBA
→ perceptual transform once
→ tonal mapping
→ posterize
→ ramp lookup
→ palette lookup
→ final RGBA
```

Do not write and reread intermediate RGBA when no intermediate evidence is decision-changing.

### Fusion candidates

Safe initial fusion family:

```text
auto_levels
posterize
gradient_map nearest/blend
generated_gradient_map nearest/blend
palettize nearest
```

Do **not** fuse blindly across:

- spatial kernels;
- error diffusion;
- operations whose exact integer rounding order changes output;
- an operation whose intermediate output is intentionally required.

### Acceptance

- bit-for-bit equivalence against unfused fixtures;
- fewer full pixel traversals;
- fewer full-size temporary buffers;
- no loss of alpha semantics.

---

## P0.3 — Spatial Shading Uses Full-Frame Temporary Fields

### Current problem

Directional shading currently conceptually requires:

```text
RGBA
→ height Float32Array
→ dx Float32Array
→ dy Float32Array
→ RGBA output
```

For large atlases this creates unnecessary full-frame Float32 memory.

### Required final form

Streaming Sobel:

```text
previous scalar row
current scalar row
next scalar row
→ Sobel
→ normal/light
→ output
```

Temporary spatial memory should move toward:

```text
O(width)
```

instead of:

```text
O(width × height)
```

For ROI execution, row width is ROI + halo rather than atlas width.

### Acceptance

- same directional result within defined numeric tolerance;
- no full dx/dy buffers;
- bounded rows reused rather than recreated per pixel.

---

## P0.4 — Color Cache Is Not Entropy-Aware

### Current problem

`Map<packed RGBA, Oklab>` is effective for low-color pixel art but can become memory-heavy for high-entropy references.

A photo-like 512×512 input can have very high unique-color count, making JS Map overhead larger than the computation saved.

### Required policy

Adaptive cache:

```text
low unique-color growth
→ cache

high unique-color growth / poor hit ratio
→ stop admitting new entries or switch to bounded mode
```

Required metrics:

```text
cache_hits
cache_misses
peak_entries
admission_disabled
hit_ratio
```

### Stop rule

Do not introduce a persistent/global cache. Request-local compute cache remains the safety boundary until LIVE_BLOCKBENCH invalidation evidence exists.

---

## P0.5 — Palette Lookup Result Cache Missing

### Current problem

Oklab conversion can be cached, but repeated colors still repeat linear nearest-palette comparison.

Cost remains approximately:

```text
pixels × palette_size
```

for nearest mapping.

### Required cache

Key:

```text
palette fingerprint + packed RGBA
```

Value for nearest:

```text
nearest_index
```

Value for ordered/dither candidate selection:

```text
nearest_1
nearest_2
distance_1
distance_2
```

This is especially valuable for Minecraft/pixel-art textures with repeated colors.

### Search strategy

Do not jump directly to VP-tree/k-d tree.

Initial policy:

```text
small palette
→ linear scan + result cache

medium palette
→ result cache + measured comparison budget

large/high-entropy case
→ only consider indexed search after benchmark evidence
```

---

## P0.6 — Dirty Bounds Are Rediscovered After Compute

### Current problem

`changedRect(source, result)` performs another full comparison pass after compute.

### Required final form

Dirty scope should propagate through the plan:

```text
known ROI
+ kernel-local change tracking
→ union dirty bounds
```

A full final scan should be fallback only for operations that cannot report precise change scope.

### Acceptance

- exact dirty rect for ROI/fused kernels;
- no full diff pass on normal bounded path;
- no false narrowing of evidence.

---

## P0.7 — Palette Compliance Preflight Is Too Expensive

### Current problem

A palette-compliance skip can cost a full scan before the actual palettize pass. Earlier implementation also created temporary hex strings per pixel.

### Required form

Use packed integer RGB/RGBA sets.

Decision path:

```text
small bounded sample
→ outside palette found?
   yes → skip full compliance proof, execute remap
   no  → full validation only when skip payoff is meaningful
```

For very small textures a single direct pass may be cheaper than a separate compliance pass; planner must own that decision.

---

# 5. P1 Compute Intelligence

## P1.1 — Auto Levels Uses Full Sort

Current exact percentile path:

```text
collect L values
→ sort
→ percentile
```

Cost:

```text
O(N log N)
```

High-end path:

```text
small N → exact sort
large N → fixed lightness histogram
```

Histogram path:

```text
O(N + bins)
constant bounded histogram memory
```

Use measured threshold; do not choose it arbitrarily.

---

## P1.2 — Planner Is Peephole-Based, Not Cost-Based

Current planner can:

- drop explicit zero-strength steps;
- rewrite equivalent operations;
- skip some redundant remaps.

It does not yet model:

```text
pixel count
ROI size
unique-color estimate
palette size
edge density
tonal span
estimated passes
estimated comparisons
temporary bytes
```

Required planner output should eventually include:

```text
requested steps
optimized steps
fused groups
ROI
halo
estimated pixel visits
estimated palette comparisons
cache policy
dither policy
temporary-byte estimate
```

Keep estimates clearly labeled; they are not latency proof.

---

## P1.3 — Error Diffusion Is Not Edge-Aware

Current Floyd–Steinberg diffusion can add unnecessary noise around strong edges or already textured regions.

Target:

```text
flat gradual region
→ allow diffusion

strong edge
→ reduce diffusion

already high-frequency region
→ reduce/disable diffusion
```

This should be driven by a bounded edge/detail metric, not subjective presets.

---

## P1.4 — Per-Pixel JS Allocation Still Exists

Hot paths still create small tuples/objects in places where scalar/reused storage would be cheaper.

Audit targets:

- `copyPixel()`;
- temporary `{L,a,b}` objects;
- repeated mapped RGBA tuples.

Do not micro-optimize before ROI/fusion/streaming. Address after the larger P0 wins.

---

## P1.5 — Palette Extraction Is Baseline Quality

Median-cut is acceptable baseline but not final high-end palette generation.

Future candidate sequence:

```text
frequency-aware histogram
→ perceptual clustering
→ optional k-means refinement
→ palette error score
→ smallest palette satisfying quality target
```

Do not implement until executor P0 work is finished.

---

# 6. Deep AI / Token Audit — Remaining Waste

## P0.1 — Search/Describe Must Stay Progressive

Current direction is correct:

```text
known capability → invoke
unknown capability → search <= 4 normally
schema uncertainty → describe input only
full metadata → explicit detail=full
```

Regression hazards:

- restoring full descriptions in search;
- increasing search breadth as reassurance;
- returning output schema/ownership/lifecycle by default;
- calling describe after a known canonical capability invocation already has valid arguments.

Keep search hard cap <= 8 unless evidence changes.

---

## P0.2 — Generic Continuation Projection Is Not Complete

Gateway result compaction still contains capability-specific logic.

Target semantic result classes:

```text
continuation_identity
changed_state
verification_scope
diagnostics
debug_detail
```

Gateway projection should be driven by verification/continuation semantics rather than an expanding list of capability-name special cases.

Do not strip state required for recovery or next mutation.

---

## P0.3 — Branch-Focused Describe Coverage Is Incomplete

Branch projection exists for selected consolidated tools, but not every large schema has a focused projection path.

Audit large schemas by **actual describe payload**, then add projection only when:

```text
branch is known before describe
AND
unrelated branches materially dominate payload
AND
Runtime validation remains authoritative
```

Do not add branch tables for small schemas.

---

## P1.1 — Static Instruction Prefix Remains Large

Current approximate repo-owned prefix after safe deduplication:

```text
common prefix              ~21.5 KB
texturing authoring        ~34.8 KB
```

Main loaded owners:

```text
root AGENTS
mcp/AGENTS
Gateway instructions
four Gateway tool schemas
active specialist Skill
```

Do not aggressively shorten instructions merely for byte reduction.

Safe slimming rule:

```text
remove prose only when another concurrently loaded owner remains authoritative
```

The explicit invariant:

```text
a higher-context residue does not transfer the entire task
```

must remain present because repository tests treat it as safety/ownership behavior, not cosmetic wording.

---

## P1.2 — Texturing Specialist Is Still Large

Texturing specialist is roughly 13 KB.

Do not split it merely to improve a static metric. First classify sections:

```text
always decision-changing
conditional reference knowledge
conditional PBR/render knowledge
rare native-Painter fallback knowledge
verification/handoff
```

Only move a section behind progressive loading if:

- deterministic routing can identify when it is needed;
- missing it on the hot path cannot silently reduce authoring quality;
- loading it separately saves more repeated context than the routing overhead it introduces.

---

## P1.3 — Control Envelope Needs Real Session Evidence

Current Control envelope proxy:

```text
8 KB total
2 KB continuation reserve
```

This is a regression guard, not an ideal target.

Do not shrink required reference/identity facts to satisfy the byte proxy.

Use future live telemetry to determine whether:

- stage context is regularly near the ceiling;
- optional fields are commonly dropped;
- the same required data repeats in subsequent turns despite context handles.

---

## P1.4 — Prompt Cache Stability Is a First-Class Efficiency Concern

Repo-owned stable context has fingerprints.

Avoid unnecessary churn in:

- `AGENTS.md`;
- `mcp/AGENTS.md`;
- active specialist Skills;
- Gateway instructions;
- Gateway tool schemas.

Dynamic task/user state belongs in the dynamic tail.

High-end context layout:

```text
stable common prefix
→ stable stage specialist extension
→ content-addressed stage context handles
→ small dynamic user/control delta
→ compact tool continuation receipts
```

Actual cache reuse requires client/provider telemetry.

---

# 7. Unified Final-Form Architecture

The compute and AI problems share the same design rule:

> **Do not expand work until evidence shows it is required.**

## AI Context Compiler

```text
user intent
→ known route?
   yes → direct invoke
   no  → bounded search
→ schema known?
   yes → invoke
   no  → branch-focused input describe
→ invoke
→ semantic continuation projection
→ only decision-changing verification
```

## Texture Compute Compiler

```text
texture intent
→ ROI analysis
→ step simplification
→ cost estimate
→ fusion groups
→ cache strategy
→ spatial halo plan
→ streaming/tiled kernels
→ known dirty bounds
→ one atomic transaction
→ full correctness proof
```

The final design is **lazy, bounded, progressive, and evidence-driven** on both sides.

---

# 8. Implementation Order

## Phase C0 — Measurements / Regression Ownership

Before P0 implementation:

- retain current correctness gates;
- add compute execution metrics for:
  - pixel visits;
  - full passes;
  - fused passes;
  - temporary bytes estimate;
  - palette comparisons;
  - cache peak/hit ratio;
  - ROI pixel count vs atlas pixel count;
- keep actual token claims disabled without telemetry.

## Phase C1 — ROI + Dirty Scope

1. internal compute ROI contract;
2. halo derivation;
3. bounded source extraction or indexed source view;
4. exact dirty-bound propagation;
5. transaction integration.

## Phase C2 — Pointwise Fusion

1. classify fusible operations;
2. build equivalent scalar kernel;
3. add equivalence fixtures;
4. remove intermediate RGBA allocations on fused path;
5. record pass reduction.

## Phase C3 — Streaming Spatial Kernels

1. row-stream height/lightness;
2. streaming Sobel;
3. direct light application;
4. ROI + halo integration;
5. no full dx/dy fields.

## Phase C4 — Adaptive Caches / Palette Lookup

1. bounded Oklab cache;
2. cache admission/hit-ratio policy;
3. nearest/two-nearest palette result cache;
4. packed palette compliance;
5. comparison counters.

## Phase C5 — Planner Cost Model

Use measured cost proxies to choose:

```text
direct
sample-first
nearest
ordered
diffusion
fused
streaming
```

Do not claim wall-clock superiority until local/live benchmark.

## Phase A1 — Gateway Result Projection

1. audit largest recurring structured results;
2. classify continuation semantics;
3. replace capability-name special cases only when generic projection is equivalent;
4. preserve recovery/verification state.

## Phase A2 — Focused Describe Expansion

1. rank describe payload hotspots;
2. add branch projection only for proven large branches;
3. keep `detail=full` explicit.

## Phase A3 — Live AI Usage Telemetry

When client/provider telemetry is available, record:

```text
task class
accepted result
input tokens
cached input tokens
cache-miss tokens
reasoning tokens
output tokens
tool calls
search calls
describe calls
status calls
correction rounds
quality verdict
user correction count
```

Only then make actual token-saving claims.

---

# 9. Explicit Non-Goals / Stop Rules

Do not implement yet:

- GPU compute;
- WASM/SIMD;
- worker pools;
- persistent cross-call texture compute cache;
- VP-tree/k-d tree palette lookup;
- generic node-based texture graph;
- second texture mutation system;
- fifth Gateway public tool;
- global revision database;
- private Blockbench RenderTarget copies.

Reason:

```text
ROI + fusion + streaming + bounded cache
```

have much higher expected ROI with lower architecture risk.

Do not weaken:

- full transaction revision correctness;
- Undo safety;
- user approval distinction;
- reference fidelity;
- visual verification when it changes the acceptance judgement;
- mutation interruption fail-closed behavior.

---

# 10. Proof Boundary

## REMOTE_GITHUB may prove

- source ownership;
- deterministic algorithm equivalence;
- schema/context byte proxies;
- test/CI correctness;
- static pass/allocation proxy counts;
- no-op/fusion/ROI planning contracts;
- exact-head generated/source consistency.

## LOCAL_CODE required for

- wall-clock benchmark on representative bitmaps;
- memory/GC profiling;
- worker/WASM comparison if ever justified;
- generator/toolchain-only artifacts.

## LIVE_BLOCKBENCH required for

- native latency;
- UI responsiveness;
- actual Painter/runtime lifecycle;
- Undo/Redo/save/reopen interaction;
- manual edit invalidation;
- real visual quality acceptance;
- installed end-to-end accepted-result efficiency.

---

# 11. Definition of “High-End Mature” for This Area

Do not call Texture Compute + AI usage “final form” until all of these are true:

### Compute

- local edit does not require full-atlas compute by default;
- compatible pointwise operations fuse;
- spatial shading streams/tiles instead of allocating full derivative fields;
- cache policy is bounded by measured usefulness;
- palette lookup reuses repeated-color results;
- dirty scope is propagated, not rediscovered by a mandatory full diff;
- planner exposes measurable execution cost proxies;
- output remains reference-faithful and deterministic.

### AI / Context

- known capabilities invoke without ceremony;
- discovery is bounded and progressive;
- large describe schemas are branch-focused where justified;
- recurring tool results expose only continuation-relevant state;
- static instruction duplication has an explicit owner;
- stage context reuse is content-addressed;
- conversation compaction uses a fresh continuation checkpoint;
- actual provider telemetry confirms lower usage without higher user-correction rate.

---

# 12. Immediate Next Work

The next implementation should be:

```text
Texture Compute Planner v2
Phase C1: ROI + dirty-scope propagation
```

Then:

```text
C2 pointwise fusion
C3 streaming Sobel/directional shade
C4 adaptive caches + palette-result cache
```

AI/context work should continue in parallel only where it is low-risk:

```text
generic result projection audit
describe-payload hotspot measurement
actual telemetry preparation
```

Do not add more texture filters until C1–C4 are complete or evidence shows a specific missing algorithm blocks quality.
