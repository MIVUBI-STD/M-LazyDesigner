# Cross-Domain Authoring Responsibility Vocabulary

Status: `CANDIDATE_RULE` on branch `Ref` only. Not canonical schema.

## Purpose

Compress the strongest cross-domain findings from Daffa's Arsenal, Mowzie's Mobs, Orca img2blockbench, and the Blockbench Workshop prop/furniture scout.

The goal is not to add another asset taxonomy, workflow engine, model specification, or Runtime schema. This document proposes a small reasoning vocabulary that explains why an existing Cube/Group/Bone/Locator/control relationship should exist before authoring complexity is added.

## Compatibility With Existing LazyDesigner Policy

LazyDesigner's active Geometry Standard already owns Semantic Form, Representation Choice, construction + transform ownership, Cube-owned vs Group/Bone-owned transforms, primary hierarchy timing, meaningful pivots, semantic naming, Locator intent, and minimum geometry required to preserve correct 3D form.

Therefore this research must extend those concepts, not duplicate them. The candidate vocabulary is a reasoning projection over existing owners, not a new canonical data model.

## Why the Previous Role Enum Is Too Heavy

Earlier research proposed: `STRUCTURAL_STATIC`, `ARTICULATED_PRIMARY`, `SECONDARY_MOTION`, `CORRECTIVE_FOLLOWER`, `ATTACHMENT_ANCHOR`, `CONTROL_HELPER`, `STATE_VARIANT`, `UNKNOWN`.

This mixes visible form, transform responsibility, motion importance, deformation relationship, attachment semantics, state, and evidence uncertainty. A single authored owner can legitimately participate in more than one of these. `UNKNOWN` is also an evidence state, not an authoring role.

## Proposed Compact Vocabulary

Use six responsibility reasons only when they materially affect construction.

### 1. FORM

The owner groups geometry because the pieces form one coherent semantic mass or shared transform unit. Examples: static furniture body, receiver shell, torso mass, or one segmented form whose pieces must move together. `FORM` does not imply independent animation.

### 2. ARTICULATION

The owner exists because a part/segment needs an independent transform or participates in a meaningful joint/chain. Examples: toolbox lid, hinge, arm → forearm → hand, neck chain, mechanical lever, segmented tail.

Required reasoning: motion intent + transform owner + pivot/joint relationship + parent continuity.

### 3. ATTACHMENT

The owner provides transform identity for holding, mounting, effects, presentation, or another downstream object without requiring visible volume. Examples: hand item location, effect origin, back-mounted item location, scope position. Prefer existing Locator semantics when visible geometry is unnecessary.

### 4. STATE

The owner or geometry variant exists because a materially different state changes visible form, transform, or presentation. Examples: open vs closed hand, loaded vs empty visible configuration, folded vs deployed component. A state label alone is not sufficient.

### 5. FOLLOW

The owner/segment is separated because it must respond to another motion rather than express an independent primary action.

- `SECONDARY`: follow-through / delayed / phase-offset response.
- `CORRECTIVE`: preserve contact, clearance, garment/body relation, or believable deformation.

Examples include cloth following legs, beard/hair chains, feathers, antennae, tail follow-through, and skirt correction. This is a reasoning modifier, not a requirement for procedural runtime simulation.

### 6. CONTROL

The non-visual owner exists to coordinate or parameterize downstream authored motion/state and has a named consumer. Examples: aim blend control, feather raise control, state driver, animation helper.

Rule: no speculative control/helper. A `CONTROL` owner requires a named downstream purpose.

## What Is Deliberately Not a Responsibility Tag

- `PRIMARY / SECONDARY` describe motion priority/relationship, not owner identity.
- `STATIC` is the absence of an independent requirement, not a special role; a static prop can remain one `FORM` owner.
- `UNKNOWN / UNCERTAIN` belong to reference evidence, not hierarchy.
- `TEXTURE` is a representation choice, not hierarchy responsibility. A color/material change alone does not create a new owner.

## Responsibility Composition

Responsibilities are orthogonal and may combine.

- Static shelf: `shelf → FORM`.
- Toolbox: `toolbox_body → FORM`; `lid → FORM + ARTICULATION`.
- Mechanical object: `body → FORM`; `door → FORM + ARTICULATION`; `effect_origin → ATTACHMENT`.
- Humanoid hand: `hand → FORM + ARTICULATION`; `item_hand → ATTACHMENT`.
- Cloth around articulated legs: `leg → FORM + ARTICULATION`; `cloth → FORM + FOLLOW(CORRECTIVE)`.
- Feather chain: `feather_segment_* → FORM + ARTICULATION + FOLLOW(SECONDARY)`; `feather_control → CONTROL`.

Only use the chain depth actually required by intended deformation/motion.

## Minimum Sufficient Structure Decision

Before adding an owner/group/bone/helper, ask whether it materially serves at least one of: `FORM | ARTICULATION | ATTACHMENT | STATE | FOLLOW | CONTROL`.

If no, do not add it. If yes, ask whether an existing owner can already satisfy the same responsibility without harming silhouette/form, articulation, contact, state clarity, attachment identity, deformation, or correction/editability.

Only create another owner when separation is materially useful.

> Use the minimum sufficient ownership structure, not the minimum geometry and not the maximum rig sophistication.

## Element vs Owner

`ELEMENT / CUBE` describes 3D form. `OWNER / GROUP / BONE / LOCATOR` owns one or more authoring responsibilities.

Therefore `7 Cubes != 7 Bones`. Conversely, one visible mass can require non-visible relationships when articulation, attachment, or control evidence actually demands them.

## Cross-Domain Pre-Authoring Projection

### Static/simple prop
`FORM + optional ATTACHMENT + optional ARTICULATION`. Default toward shallow structure.

### Mechanical object
`FORM + ARTICULATION + optional ATTACHMENT + optional STATE + optional CONTROL`. Mechanism determines pivots and parents.

### Humanoid / creature
`FORM + ARTICULATION chains + optional ATTACHMENT + optional STATE + optional FOLLOW + optional CONTROL`. Articulation may be distributed through several joints.

### Flexible accessory / garment
`FORM + FOLLOW + optional ARTICULATION chain + optional CONTROL`. Primary anatomy remains the causal motion source unless the accessory has its own action.

## Correction Projection

- shape/silhouette wrong → inspect `FORM` / representation.
- rotation path wrong → inspect `ARTICULATION` + pivot + parent.
- held/effect placement wrong → inspect `ATTACHMENT`.
- wrong visible configuration → inspect `STATE`.
- cloth/hair/accessory intersects or feels rigid → inspect `FOLLOW`.
- many bones move incoherently → inspect `CONTROL` scope / chain distribution.

Then correct the smallest causal owner.

## Animation Planning Projection

Do not equate owner responsibilities with clip inventory. Animation planning still distinguishes persistent state, transition, repeated action, long interaction/choreography, and secondary response. The vocabulary only helps decide which owners should participate and why.

## Evidence / Review Pairing

Orca-derived candidate reasoning stays sparse: uncertainty asks what construction/acceptance decision is at risk; identity-critical features bind to `GEOMETRY | TEXTURE | ANIMATION | MIXED`; review targets select the smallest evidence that can prove the risky relationship.

## Candidate Quality Tests

The vocabulary is useful only if it improves at least one of: fewer unnecessary groups/helpers; faster causal correction; cleaner pivot/parent decisions; better primary-vs-secondary motion distinction; lower context/tool cost to accepted result; with no decrease in visual/reference quality.

Reject or narrow it if agents begin producing verbose role inventories for trivial assets.

## Context-Economy Rule

Do not inject this full research document into routine authoring. If eventually promoted, the hot-path projection should be approximately:

`Owner reason: FORM | ARTICULATION | ATTACHMENT | STATE | FOLLOW | CONTROL`

`Create another owner only when an existing owner cannot satisfy the required responsibility cleanly. Color/detail difference alone is not an ownership reason.`

Additional detail should load only for ambiguous/correction-heavy tasks.

## Current Verdict

The previous exclusive cross-domain role enum is rejected as unnecessarily heavy.

The six-responsibility vocabulary is retained as the more compact `CANDIDATE_RULE` because it maps directly onto existing LazyDesigner hierarchy/locator concepts, explains both complex and simple assets, supports mechanical and organic authoring, preserves Minimum Sufficient Structure, avoids another schema/workflow, and can compress to two hot-path lines if proven useful.

No canonical `Local` policy or Runtime schema change is authorized by this research alone.