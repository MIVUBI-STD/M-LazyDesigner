export const BEDROCK_PARTICLE_RESOURCE_LAYOUT = {
  particle_directory: "particles",
  texture_directory: "textures/particle",
  particle_suffix: ".particle.json",
  texture_suffix: ".png",
} as const;

function slashPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

export function isCanonicalParticleTextureReference(value: string): boolean {
  const normalized = slashPath(value).replace(/^\.\//, "");
  return /^textures\/particle\/[A-Za-z0-9_.\/-]+$/.test(normalized) &&
    !normalized.endsWith("/") &&
    !normalized.toLowerCase().endsWith(".png") &&
    !normalized.split("/").includes("..");
}

export function particleTexturePngSuffix(textureReference: string): string {
  if (!isCanonicalParticleTextureReference(textureReference)) {
    throw new Error(
      `Generated particle texture reference must stay under ${BEDROCK_PARTICLE_RESOURCE_LAYOUT.texture_directory}/ and omit the .png suffix.`
    );
  }
  return `/${slashPath(textureReference).replace(/^\.\//, "")}${BEDROCK_PARTICLE_RESOURCE_LAYOUT.texture_suffix}`;
}

export function particleTextureOutputMatchesReference(
  textureReference: string,
  absoluteOutputPath: string
): boolean {
  const normalizedOutput = slashPath(absoluteOutputPath).replace(/\/$/, "");
  const suffix = particleTexturePngSuffix(textureReference);
  const caseInsensitive = /^[A-Za-z]:\//.test(normalizedOutput) || absoluteOutputPath.startsWith("\\\\");
  return caseInsensitive
    ? normalizedOutput.toLowerCase().endsWith(suffix.toLowerCase())
    : normalizedOutput.endsWith(suffix);
}
