import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import {
  compileMotionToCreateAnimationPlan,
} from "@/lib/animation/toolCompiler";
import {
  compileSecondaryMotion,
  type SecondaryMotionLink,
} from "@/lib/animation/secondaryMotion";

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

const poses = Array.from({ length: 8 }, (_, index) => ({
  id: `driver_${index}`,
  time: index * 0.3,
  bones: {
    body: {
      rotation: [
        Math.sin(index * 0.7) * 18,
        Math.cos(index * 0.5) * 8,
        Math.sin(index * 0.4) * 5,
      ] as [number, number, number],
    },
  },
}));

const recipe = {
  name: "secondary_motion_demo",
  loop: true,
  duration: 2.2,
  poses,
};

const links: SecondaryMotionLink[] = [
  "strap_L",
  "strap_R",
  "cloth_L",
  "cloth_R",
  "antenna_L",
  "antenna_R",
].map((child_bone, index) => ({
  parent_bone: "body",
  child_bone,
  lag_seconds: 0.04 + index * 0.005,
  rotation_gain: 0.22 + index * 0.025,
  settle: 0.5,
}));

const expandedRecipe = compileSecondaryMotion(recipe, links);
const compiled = compileMotionRecipe(expandedRecipe);
const explicit = compileMotionToCreateAnimationPlan(compiled);

const semanticInput = { recipe, links };
const semanticBytes = bytes(semanticInput);
const explicitBytes = bytes(explicit);
const compiledBones = Object.keys(compiled.bones);
const expectedBones = 1 + links.length;
const deterministic =
  JSON.stringify(
    compileMotionToCreateAnimationPlan(
      compileMotionRecipe(compileSecondaryMotion(recipe, links))
    )
  ) === JSON.stringify(explicit);

const result = {
  authored_driver_poses: poses.length,
  authored_driver_bones: 1,
  secondary_links: links.length,
  compiled_bones: compiledBones.length,
  semantic_payload_bytes: semanticBytes,
  explicit_animation_plan_bytes: explicitBytes,
  serialized_payload_proxy_reduction: 1 - semanticBytes / explicitBytes,
  quality_contract: {
    expected_bones: expectedBones,
    compiled_bones: compiledBones.length,
    deterministic,
    secondary_bones_present: links.every((link) =>
      compiledBones.includes(link.child_bone)
    ),
  },
};

console.log(JSON.stringify(result, null, 2));

if (result.quality_contract.compiled_bones !== expectedBones) {
  throw new Error("Motion recipe did not compile every expected secondary bone.");
}
if (!result.quality_contract.secondary_bones_present) {
  throw new Error("Motion recipe lost one or more secondary-motion bones.");
}
if (!result.quality_contract.deterministic) {
  throw new Error("Motion recipe expansion is not deterministic.");
}
if (result.serialized_payload_proxy_reduction < 0.15) {
  throw new Error(
    "Motion recipe payload proxy reduction regressed below 15%."
  );
}
