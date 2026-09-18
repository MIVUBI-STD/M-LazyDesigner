# Reference Intelligence ↔ LazyDesigner Quality Benchmark Crosswalk

Status: REMOTE_GITHUB source-contract validation on branch `Ref`.

Purpose: test whether the experimental cross-domain responsibility vocabulary and compact reference reasoning metadata map coherently onto LazyDesigner's own current quality benchmark fixture without changing the benchmark schema.

## Benchmark Authority Boundary

`mcp/tests/fixtures/quality-benchmark-cases.json` is a LazyDesigner-owned categorical quality contract. It does not prove live visual quality; it defines dimensions/failure classes that remote source tests can verify.

The reference-intelligence vocabulary remains advisory reasoning. It must not replace benchmark dimensions, verdicts, profiles, or validation ownership.

## Crosswalk

| Benchmark case | Relevant responsibilities | Reasoning contribution | Existing benchmark dimensions/failures it helps diagnose |
| --- | --- | --- | --- |
| `prop_furniture` | FORM, optional ARTICULATION/ATTACHMENT | preserve shallow structure; separate elements from transform owners | silhouette, required_part_completeness, attachment_contact, negative_space, broken_attachment |
| `vehicle` | FORM, ARTICULATION, ATTACHMENT, STATE | identify moving assemblies and mount/contact ownership before animation | motion_ready_structure, pivot_rig_suitability, clearance_contact, invalid_motion_pivot, interpenetration_at_required_extreme |
| `character_mob` | FORM, ARTICULATION, ATTACHMENT, FOLLOW, STATE, optional CONTROL | distinguish primary anatomy, held points, secondary/corrective structures, visible variants | pivot_rig_suitability, joint_gap_control, weight_transfer, clearance_contact, excessive_joint_gap, unintended_foot_slide |
| `organic_curved` | FORM, ARTICULATION, FOLLOW | choose meaningful segmentation and chain continuity without micro-segmentation | curve_segmentation_quality, silhouette, silhouette_stair_step_oversegmentation |
| `mechanical_assembly` | FORM, ARTICULATION, ATTACHMENT, STATE, optional CONTROL | assign pivots/owners to actual mechanism and preserve clearance | motion_ready_structure, surface_integrity, pivot_rig_suitability, clearance_contact, invalid_motion_pivot |
| `layered_cutout` | FORM + representation choice; usually no extra ownership for color/detail | prevent ownership/geometry growth from surface information alone | surface_integrity, physical_uv_fidelity, alpha_cutout_boundary, cutout_boundary_mismatch |

## Important Convergence

### 1. Minimum Sufficient Structure aligns with quality-precedes-efficiency

The benchmark explicitly keeps quality separate from efficiency and does not reward cube count. The responsibility vocabulary similarly does not minimize geometry count; it prevents unnecessary ownership/hierarchy while preserving required form.

### 2. ARTICULATION maps to existing pivot/clearance evidence

No new pivot score is needed. `ARTICULATION` is only a diagnostic reason for why `pivot_rig_suitability`, `clearance_contact`, or `invalid_motion_pivot` may fail.

### 3. FOLLOW maps to character/organic failure diagnosis

`FOLLOW` helps explain secondary/corrective relationships that can contribute to joint gaps, contact failures, rigid secondary structures, or poor weight transfer, but it does not create a new benchmark verdict.

### 4. ATTACHMENT maps to existing attachment/contact dimensions

The benchmark already measures `attachment_contact` and `broken_attachment`. The vocabulary only helps locate the causal owner (Locator/bone/parent relation) before mutation.

### 5. Surface detail does not imply owner growth

`layered_cutout` and texture dimensions support the existing Geometry Standard boundary: markings/color/alpha detail remain representation concerns unless they materially change 3D form.

## Orca-Derived Metadata Crosswalk

### Construction-changing uncertainty

Useful when unresolved evidence could trigger benchmark failures such as `wrong_part_count`, `broken_attachment`, `reference_unsupported_invention`, or invalid topology/pivot assumptions.

### Identity-critical feature ownership

Maps to existing dimensions such as `identity_markings`, silhouette, required-part completeness, and reference pose fidelity. It is a causal pointer, not a new score.

### Risk-derived review targets

Maps to the benchmark's dimensional question. Example: invalid-motion risk should trigger the smallest evidence capable of checking pivot/clearance/extreme contact instead of a fixed screenshot set.

## Static Source Verdict

`REMOTE_BENCHMARK_ALIGNED`

The experimental reasoning vocabulary and metadata align with all six current LazyDesigner benchmark cases without requiring changes to the canonical benchmark fixture or introducing an aggregate score.

## What This Does Not Prove

- visual resemblance;
- animation quality in live Blockbench;
- actual reduction in correction rounds;
- tool-call reduction;
- accepted-result improvement;
- Runtime freshness or native behavior.

Those remain LOCAL_CODE / LIVE_BLOCKBENCH proof requirements.