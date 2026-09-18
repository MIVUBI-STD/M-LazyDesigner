# Compact Modelling Refinements — Static Benchmark Stress Test

Status: `REMOTE_GITHUB` compatibility test on branch `Ref`.

## Purpose

Check the six additive modelling refinements against LazyDesigner's current synthetic quality benchmark cases.

Important boundary:

`mcp/tests/fixtures/quality-benchmark-cases.json` declares:

- `evidence_class = synthetic_contract_fixture`;
- `measured_baseline = false`;
- categorical verdicts only;
- quality precedes efficiency.

Therefore this test checks **semantic compatibility only**. It does not prove quality improvement, lower tool cost, or lower correction count.

## Candidate Refinements

R1 — stable semantic ownership should outlive clip growth.
R2 — rig, clip, and controller complexity are independent budgets.
R3 — presentation context should preserve base semantic ownership where possible.
R4 — local visual/state variants should isolate the smallest changed branch.
R5 — Locator/ATTACHMENT owners may be animated.
R6 — family-level attachment contracts may remain stable while anatomy varies.

## Benchmark Crosswalk

| Benchmark case | Applicable refinements | Why compatible | Risk if misapplied | Verdict |
| --- | --- | --- | --- | --- |
| `prop_furniture` | R4, sometimes R3 | local optional parts/visual variants can avoid whole-model duplication | forcing state/variant logic onto static props | PASS |
| `vehicle` | R1, R2, R3, R4, R5 | motion-ready structure, pivots, clearance, coupled/local branches, animated attachment points | hiding truly different mechanical topology behind over-reuse | PASS |
| `character_mob` | R1, R2, R3, R4, R5, R6 | stable anatomy across clips/presentation, held/worn attachment, local visible states, family contracts | over-reusing a rig when anatomy/deformation responsibility genuinely differs | PASS |
| `organic_curved` | R1, R2, R6 | stable chains across motions; family locators need not force identical topology | using family reuse to suppress required articulation/curve segmentation | PASS |
| `mechanical_assembly` | R1, R2, R3, R4, R5 | separates mechanism hierarchy from clip/controller growth and local state branches | reusing base ownership when motion requires a genuinely separate pivot/owner | PASS |
| `layered_cutout` | R4 only in narrow cases | local presentation change can remain local; no reason to duplicate base form | treating texture/alpha variation as rig/state variation | PASS WITH NARROW SCOPE |

## Refinement-Specific Failure Guards

### R1 — Stable semantic ownership should outlive clip growth

Guard:

```text
reuse existing owners
ONLY IF
required motion remains expressible with correct pivot / parent / deformation relationships
```

Do not preserve a deficient rig merely to avoid adding one justified owner.

Relevant benchmark evidence:

- `motion_ready_structure`;
- `pivot_rig_suitability`;
- `joint_gap_control`;
- `clearance_contact`;
- `invalid_motion_pivot`.

Static verdict: `COMPATIBLE`.

### R2 — Independent rig / clip / controller budgets

Guard:

Independent does not mean unrelated.

A new clip or controller state may reveal a missing rig capability, but its existence alone is not evidence for new hierarchy.

Relevant benchmark evidence:

- animation dimensions remain evaluated separately from geometry dimensions;
- benchmark contains no cube/bone/clip-count reward;
- `quality_precedes_efficiency = true`.

Static verdict: `COMPATIBLE`.

### R3 — Presentation context preserves base ownership

Guard:

Preserve topology only where transform capability and form remain semantically equivalent.

Different first/third-person, coupled/uncoupled, worn/held views may still justify:

- local geometry branch;
- different pivot frame;
- different transform values;
- different clips.

Relevant benchmark evidence:

- cross-view proportion;
- attachment contact;
- reference pose fidelity;
- clearance/contact.

Static verdict: `COMPATIBLE`.

### R4 — Smallest changed branch

Guard:

Do not fragment a model into speculative variant branches. Create a local branch only when the state/presentation materially changes visible form or transform ownership.

Relevant benchmark evidence:

- required part completeness;
- wrong part count;
- reference unsupported invention;
- surface integrity.

Static verdict: `COMPATIBLE`.

### R5 — Animated Locator / ATTACHMENT owner

Guard:

Animated Locator is valid only when a moving attachment/reference transform is genuinely required. It must not substitute for visible geometry that should exist.

Relevant benchmark evidence:

- attachment contact;
- broken attachment;
- pivot rig suitability;
- clearance/contact.

Static verdict: `COMPATIBLE`.

### R6 — Family-level attachment contract across variable anatomy

Guard:

Reuse semantic locator contracts, not fixed topology.

Each asset may still need different:

- hierarchy depth;
- pivot placement;
- segment count;
- silhouette masses;
- deformation structure.

Relevant benchmark evidence:

- silhouette;
- cross-view proportion;
- required-part completeness;
- curve segmentation quality;
- reference unsupported invention.

Static verdict: `COMPATIBLE`.

## Anti-Overdevelopment Result

No candidate requires:

- a new benchmark case;
- a new quality score;
- a new stored owner-role schema;
- a new tool;
- a new Runtime capability;
- a new workflow engine;
- a new persistent database.

## Static Result

```text
R1 PASS
R2 PASS
R3 PASS
R4 PASS
R5 PASS
R6 PASS
```

Meaning: no contradiction was found with the current synthetic quality contract when the stated guards are respected.

## What Remains Unproven

- accepted visual quality improvement;
- fewer correction rounds;
- reduced unnecessary owner count in real authoring;
- lower tool/context cost;
- better animation editability;
- live Blockbench correctness.

Those require current-quality LazyDesigner-owned native tests.

## Promotion Recommendation

Do not promote six separate verbose policy sections.

If native validation succeeds, prefer one compact addition near existing transform/hierarchy/Locator guidance:

```text
Reuse stable semantic ownership across clip, controller, and presentation growth unless a new transform/attachment/deformation capability is required. Treat rig, clip, and controller complexity as separate budgets. Keep local variants local, and allow Locators to move when they own a moving attachment/reference transform.
```

Family-level locator-contract guidance should remain conditional/contextual unless repeated LazyDesigner-owned family authoring demonstrates recurring value.