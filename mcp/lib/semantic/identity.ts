export type CapabilitySemanticId =
  | `cap:${string}`
  | `branch:${string}/${string}=${string}`;

export type SchemaSemanticId =
  | `schema:${string}/input`
  | `schema:${string}/output`;

export type SemanticBranchIdentity = {
  field: string;
  value: string;
};

function semanticSegment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Stable semantic identity is intentionally independent from repository paths.
 * File moves must not invalidate capability identity or AI-facing caches.
 */
export function capabilitySemanticId(
  capability: string,
  branch?: SemanticBranchIdentity
): CapabilitySemanticId {
  const capabilityId = semanticSegment(capability);
  if (!branch) return `cap:${capabilityId}`;
  return `branch:${capabilityId}/${semanticSegment(branch.field)}=${semanticSegment(branch.value)}`;
}

export function schemaSemanticId(
  capabilityId: CapabilitySemanticId,
  direction: "input" | "output"
): SchemaSemanticId {
  return `schema:${semanticSegment(capabilityId)}/${direction}`;
}
