import {
  BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER,
  BLOCKIT_PROJECT_AFFINITY_HEADER,
  type BlockitAuthoringPhaseAffinity,
} from "./projectAffinity";

export function buildRuntimeAffinityHeaders(
  projectUuid: string | null,
  authoringPhase: BlockitAuthoringPhaseAffinity | null
): Headers {
  const headers = new Headers();

  if (projectUuid) {
    headers.set(BLOCKIT_PROJECT_AFFINITY_HEADER, projectUuid);
  }
  if (authoringPhase) {
    headers.set(BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER, authoringPhase);
  }

  return headers;
}

export function isCatalogFresh(input: {
  clientReady: boolean;
  connectedSignature: string | null;
  catalogCount: number;
  catalogValidatedAt: number;
  catalogLeaseMs: number;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();

  return Boolean(
    input.clientReady &&
    input.connectedSignature &&
    input.catalogCount > 0 &&
    input.catalogValidatedAt > 0 &&
    now - input.catalogValidatedAt <= input.catalogLeaseMs
  );
}
