import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import type { ControlAuthoringDomain, ControlContextHandle, ControlContextSemanticDependency } from "./types";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../capabilities/semanticRegistry";
import { semanticFingerprint } from "../capabilities/semanticRegistry";
import type { ControlProfile } from "./referencePackage";

export const MODELLING_PATH = ".agents/skills/lazydesigner-modelling/SKILL.md";
export const TEXTURING_PATH = ".agents/skills/lazydesigner-texturing/SKILL.md";
export const ANIMATION_PATH = ".agents/skills/lazydesigner-animation/SKILL.md";

export const PROFILE_PATHS: Record<ControlProfile, string> = {
  PROP_FURNITURE: "docs/03-authoring/modelling/profiles/prop-furniture.md",
  VEHICLE: "docs/03-authoring/modelling/profiles/vehicle.md",
  HUMANOID: "docs/03-authoring/modelling/profiles/humanoid.md",
  CREATURE: "docs/03-authoring/modelling/profiles/creature.md",
  MECHANICAL: "docs/03-authoring/modelling/profiles/mechanical.md",
  PLANT_FOLIAGE: "docs/03-authoring/modelling/profiles/plant-foliage.md",
  GENERIC: "docs/03-authoring/modelling/profiles/generic.md",
};

type CachedHandle = {
  signature: string;
  handle: ControlContextHandle;
};

const contextHandleCache = new Map<string, CachedHandle>();

function semanticDependenciesForPath(
  path: string
): ControlContextSemanticDependency[] {
  if (
    path === MODELLING_PATH ||
    path === TEXTURING_PATH ||
    path === ANIMATION_PATH ||
    Object.values(PROFILE_PATHS).includes(path)
  ) {
    return ["routing", "graph"];
  }
  return ["routing"];
}

function semanticRevisionForDependencies(
  dependencies: readonly ControlContextSemanticDependency[]
): string {
  return semanticFingerprint(
    Object.fromEntries(
      dependencies.map((dimension) => [
        dimension,
        CAPABILITY_SEMANTIC_CATALOG_REVISIONS[dimension],
      ])
    )
  );
}

function contextLabel(path: string): string {
  if (path === MODELLING_PATH) return "skill/modelling";
  if (path === TEXTURING_PATH) return "skill/texturing";
  if (path === ANIMATION_PATH) return "skill/animation";
  const profile = Object.entries(PROFILE_PATHS).find(([, candidate]) => candidate === path)?.[0];
  return profile ? `profile/${profile.toLowerCase().replaceAll("_", "-")}` : "doc/context";
}

function repoFile(path: string): URL {
  return new URL(`../../../${path}`, import.meta.url);
}

export async function contentHandle(path: string): Promise<ControlContextHandle> {
  const file = repoFile(path);
  const info = await stat(file);
  const signature = `${info.size}:${info.mtimeMs}`;
  const cached = contextHandleCache.get(path);
  if (cached?.signature === signature) return cached.handle;
  const bytes = await readFile(file);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const semanticDependencies = semanticDependenciesForPath(path);
  const semanticRevision = semanticRevisionForDependencies(
    semanticDependencies
  );
  const handle: ControlContextHandle = {
    id: `ctx:${contextLabel(path)}@${sha256.slice(0, 12)}.${semanticRevision.slice(0, 12)}`,
    path,
    sha256,
    semantic_dependencies: semanticDependencies,
    semantic_revision: semanticRevision,
  };
  contextHandleCache.set(path, { signature, handle });
  return handle;
}

export async function contextForAuthoringDomain(
  domain: ControlAuthoringDomain | null,
  selectedProfile: ControlProfile | null = null
): Promise<{ required: ControlContextHandle[]; optional: ControlContextHandle[] }> {
  const required: ControlContextHandle[] = [];
  if (domain === "GEOMETRY") {
    required.push(await contentHandle(MODELLING_PATH));
    if (selectedProfile) required.push(await contentHandle(PROFILE_PATHS[selectedProfile]));
  } else if (domain === "TEXTURING") {
    required.push(await contentHandle(TEXTURING_PATH));
  } else if (domain === "ANIMATION") {
    required.push(await contentHandle(ANIMATION_PATH));
  }
  return { required, optional: [] };
}
