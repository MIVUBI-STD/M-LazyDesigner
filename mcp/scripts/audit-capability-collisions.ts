import { auditCapabilitySemanticCollisions } from "../gateway/capabilities/collisionAudit";

const collisions = auditCapabilitySemanticCollisions();
console.log(
  JSON.stringify(
    {
      audited: "canonical capability aliases + semantic intents/examples",
      collision_count: collisions.length,
      collisions,
    },
    null,
    2
  )
);

if (collisions.length > 0) {
  process.exitCode = 1;
}
