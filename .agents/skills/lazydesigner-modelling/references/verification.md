# LazyDesigner Modelling Verification Reference

This file is loaded only for its named modelling decision. Durable Geometry policy remains in `docs/03-authoring/modelling/standard.md`; the modelling Skill owns hot-path execution triggers.


Load only when fresh Geometry evidence is being judged against the approved reference or a Geometry verdict is required.

## Primary Build / Difference-First Reference Fidelity Verdict
`requirement → source evidence → selected profile guidance → simplest recognizable Blockbench-buildable interpretation → PRIMARY BLOCKOUT + required hierarchy/pivots → primary PASS → identity-weighted secondary geometry`.

Verdict requires approved reference + fresh current-revision model evidence:
`claim | matching reference view | current view | observed difference | severity | owning cause | FAIL | UNVERIFIED | PASS`.
Mutation stales affected captures. Correct first cause, then recapture affected views. `capture_model_views` correspondence metadata only maps captures to canonical board slots; it is not a scorer and never creates visual PASS.
Tool success, coordinates, bounds, hierarchy, validators, or similarity scores cannot justify `PASS`. Internal Geometry `PASS` requires form/depth, surface integrity, hierarchy/pivots, and no major defect.

**Largest-difference-first:** rank only material visible differences by construction consequence, not pixel area. Fix in this order when applicable: missing/extra required part → wrong topology/attachment → wrong primary silhouette/proportion/depth → broken negative space/contact → pivot/motion-readiness defect → secondary geometric detail. Do not spend a correction round polishing a smaller difference while a higher-order structural defect remains.

**Cross-view regression rule:** a correction is accepted only when the intended difference improves and no required orthographic relation materially regresses. A front-view improvement that breaks side depth, rear attachment, top footprint, or motion clearance is `REGRESSED`, not progress.

Before user review, state the largest remaining reference differences at comparable angle/scale, including depth and identity landmarks. Neutral contact alone cannot certify an articulated assembly: inspect required closed boundaries in representative extremes, especially jaw/cheek/chest and limb attachments when present. Correct the owning structure before detail or production keys; do not hide unresolved gaps behind texture or filler Cubes.

**UV Readiness Preflight** checks thin/Box-UV collapse, aspect/representation, seam/unique-region blockers. Read-only: no production UV/`UV Layout PASS`. **User Geometry APPROVED is required** before production UV.
Layered contacts and exposed undersides need an affected side/bottom view when front/three-quarter views conceal the boundary. Distinguish dark material from actual missing surface; a prior approval does not clear a newly observed major defect.
