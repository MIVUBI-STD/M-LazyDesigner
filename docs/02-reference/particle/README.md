# Particle Reference Authoring

Canonical ChatGPT-side authority for preparing Minecraft Bedrock particle effects as standalone reference assets that can be reviewed in Snowstorm/Minecraft and optionally handed to Codex or MCP.

## Position

```text
USER
→ ChatGPT Reference Preparation
→ Particle Reference Authoring
→ Bedrock/Snowstorm particle package
→ user review
→ optional Codex / MCP / manual Minecraft use
```

This domain is upstream of MCP and independent from image/model reference generation.

## Authority boundary

```text
ChatGPT prepares/reviews/delivers standalone particle reference assets
→ Particle Reference Authoring owns it

Codex/MCP mutates active runtime assets
→ downstream implementation owners take over after explicit handoff
```

Do not run both authoring authorities on the same revision at once.

## Minimal-read rule

Do not preload the corpus.

For authoring:

```text
authoring-spec.md
→ workflow.md
→ smallest required knowledge owner set
→ qa.md only near finalization
→ delivery.md only when packaging
```

For knowledge/diagnosis:

```text
knowledge-map.md
→ one primary owner
→ one secondary owner only if the decision crosses domains
```

Normal authoring should stay within two control documents plus one primary domain owner. Add a second/third knowledge owner only when the request materially crosses boundaries. If more are needed, split the problem into separate decisions.

The specialist skill contains compact task bundles. `knowledge-map.md` owns the detailed routing map; this README does not duplicate it.

Select the [Particle Knowledge Map](knowledge-map.md) for one specific component owner; use [Current Particle Status](STATUS.md) only for maturity and unresolved proof. These are navigation links, not duplicate authorities.

## High-value routing

```text
current maturity/status
→ STATUS.md

knowledge owner selection
→ knowledge-map.md

unknown/new official component coverage
→ official-schema-coverage.md

exact defaults / omission / evaluation timing / version delta
→ official-defaults-evaluation.md

field semantics / failure modes
→ component-field-reference.md

Bedrock component mental model
→ fundamentals.md

Snowstorm generic compatibility
→ snowstorm.md

Snowstorm release capability/fix question
→ snowstorm-compatibility-matrix.md

Snowstorm regression/anomaly
→ snowstorm-version-quirks.md
```

## Evidence classes

Every durable rule is interpreted as one of:

```text
OFFICIAL BEDROCK
SNOWSTORM / WINTERSKY
EMPIRICALLY VERIFIED
HEURISTIC
```

Snowstorm-specific behavior must never redefine generic Bedrock validity. Published Snowstorm/Wintersky release notes are preferred for stable editor-capability claims; unreleased source-head behavior must be labeled development state. Static heuristics must never be presented as live rendering, FPS, or Minecraft proof.

## Coverage

The mature source/static knowledge base covers:

```text
Bedrock document/components + defaults/evaluation
emitter lifecycle/rates/shapes
motion/collision/rotation + math/physics
Molang language/math/queries/ownership
curves/events/event timing
billboards/materials/tint/lighting
RGBA texture/atlas/UV/flipbook/filtering/color
entity/locator transform context
Snowstorm/Wintersky editor mapping + release matrix + round-trip risks
performance/readability/static QA
troubleshooting + clean delivery
```

`STATUS.md` owns the closure/maturity statement and unresolved runtime-only areas.

## Texture is first-class

Load only the owner needed:

```text
texture-authoring.md
→ PNG/RGBA, atlas, UV/flipbook, tint-compatible source art

texture-resolution-sampling.md
→ resolution, resampling, downscale, alpha coverage/frame stability

texture-filtering-bleeding.md
→ hidden RGB, matte/halo, gutter/bleed, filtering/minification

texture-color-science.md
→ alpha/value/color decisions for opaque/alpha/blend/additive

appearance-rendering.md
→ material/billboard/tint/lighting behavior
```

## Molang/math is first-class

Load only the needed layer:

```text
molang.md
→ particle/emitter ownership and stability

particle-variable-inventory.md
→ documented particle-system built-ins

molang-language-math.md
→ language/operators/functions/easing

molang-formula-cookbook.md
→ reusable particle formulas

math-physics-reference.md
→ vectors/geometry/ballistics/probability

molang-queries-context.md
→ query/context host availability
```

## Boundary

ChatGPT owns requirement normalization, physical/visual decomposition, particle JSON authoring, texture/atlas generation or editing, Bedrock/Molang/Snowstorm-aware reasoning, static preflight, clean package assembly, and targeted revision.

ChatGPT does not claim live Snowstorm/Minecraft truth without review, exact Blockbench runtime behavior, measured FPS/device performance, perfect editor/runtime equivalence, or MCP implementation ownership.

## Acceptance model

```text
Bedrock/source reasoning
→ target-version schema/default check only when needed
→ relevant domain knowledge only
→ relevant static/preflight QA only
→ clean package
→ user review in actual target environment
→ targeted revision or approval
```

`LOCAL_CODE` is not required for this ChatGPT-side workflow.
