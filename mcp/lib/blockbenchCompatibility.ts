import manifest from "@/compatibility/blockbench.json";

export type BlockbenchCompatibilityStatus =
  | "validated"
  | "compatible-unverified"
  | "review-required"
  | "unsupported"
  | "invalid";

export type BlockbenchCompatibility = {
  version: string;
  status: BlockbenchCompatibilityStatus;
  minimumVersion: string;
  reviewBoundaryVersion: string;
  sourceTypeBaseline: string;
  liveValidated: boolean;
};

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
};

export const BLOCKBENCH_MIN_VERSION = manifest.minimumVersion;

function parseVersion(value: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareVersionCore(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function parsePolicyVersion(value: string): ParsedVersion {
  const parsed = parseVersion(value);
  if (!parsed) {
    throw new Error(`Invalid Blockbench compatibility policy version: ${value}`);
  }
  return parsed;
}

export function evaluateBlockbenchCompatibility(
  rawVersion: string
): BlockbenchCompatibility {
  const version = String(rawVersion ?? "").trim();
  const parsed = parseVersion(version);
  const minimum = parsePolicyVersion(manifest.minimumVersion);
  const reviewBoundary = parsePolicyVersion(manifest.reviewBoundaryVersion);
  const liveValidated = manifest.liveValidatedVersions.includes(version);

  const common = {
    version,
    minimumVersion: manifest.minimumVersion,
    reviewBoundaryVersion: manifest.reviewBoundaryVersion,
    sourceTypeBaseline: manifest.sourceTypeBaseline,
    liveValidated,
  };

  if (!parsed) {
    return { ...common, status: "invalid" };
  }

  if (compareVersionCore(parsed, minimum) < 0) {
    return { ...common, status: "unsupported" };
  }

  if (liveValidated) {
    return { ...common, status: "validated" };
  }

  if (compareVersionCore(parsed, reviewBoundary) >= 0) {
    return { ...common, status: "review-required" };
  }

  return { ...common, status: "compatible-unverified" };
}
