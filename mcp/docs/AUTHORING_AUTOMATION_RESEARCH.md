# Authoring Automation Research Intake

Updated: 2026-09-21
Branch: Local

This note records external algorithm families studied for LazyDesigner. It is an implementation filter, not a dependency wishlist.

## Adopt as small internal computation

### MaxRects atlas packing
Reference family: Jukka Jylänki RectangleBinPack, soimy/maxrects-packer.
Useful properties: deterministic rectangle packing, optional 90-degree rotation, padding, bounded atlas occupancy.
LazyDesigner adoption: data-only UV/atlas placement planner under `lib/uv/`; no new public tool and no package dependency.

### FABRIK inverse kinematics
Reference family: FABRIK literature and small JS/TS implementations such as IK.ts.
Useful properties: chain target solving from semantic end-effector intent rather than authored joint coordinates.
LazyDesigner adoption: bounded data-only chain solver under `lib/rig/`; native Blockbench IK remains authoritative for live controller behavior.

### Procedural material operations
Reference family: Material Maker, procedural image/noise/dither libraries.
Useful properties: deterministic gradient/noise/palette/dither generation so AI specifies material intent rather than individual brush strokes.
LazyDesigner adoption: small buffer-first primitives under `lib/texture/`; no visual node editor and no background renderer.

### Animation controller recipes
Reference family: game-engine Animator/FSM and Bedrock animation-controller state machines.
Useful properties: behavior intent compiles into states/transitions/blends while retaining the existing native controller mutation capability.
LazyDesigner adoption: data-only recipe compiler under `lib/animation/`; existing `manage_animation_controller` remains the only mutation owner.

## Study, do not import wholesale

- SolveSpace: constraint-system architecture is useful, but LazyDesigner should keep its bounded authoring recipe solver rather than embedding a CAD kernel.
- Blender Rigify: semantic rig generation and constraint patterns are useful; Blender-specific runtime assumptions are not.
- xatlas: chart/parameterization ideas are useful for generic meshes, but Bedrock Cube UV ownership and pixel-grid constraints require a narrower native policy.
- external Blockbench MCP projects: useful proof that semantic rig/animation generation reduces tool calls; their public surfaces and state models must not replace LazyDesigner Gateway/Control ownership.

## Non-goals

- no visual node editor;
- no second dependency graph/database;
- no background authoring service;
- no reduction of existing MCP primitives;
- no third-party runtime dependency until local benchmark proves a material win;
- no claim of performance/token savings without matching LOCAL_CODE/client telemetry.
