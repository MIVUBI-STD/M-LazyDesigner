export function requireTextureRevisionDimensions(
  width: number,
  height: number
): [number, number] {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      "Texture revision dimensions must be positive integers."
    );
  }
  return [width, height];
}

function requireTextureRevisionPixelLength(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const expectedBytes = width * height * 4;
  if (!Number.isSafeInteger(expectedBytes) || pixels.byteLength !== expectedBytes) {
    throw new Error(
      `Texture revision RGBA length mismatch: expected ${expectedBytes} bytes for ${width}x${height}, received ${pixels.byteLength}.`
    );
  }
}

function digestHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Computes a stable revision token for one decoded RGBA texture bitmap.
 *
 * Dimensions are included in the token so equal byte sequences with different
 * width/height interpretation cannot share one revision identity.
 */
export async function computeTextureRevision(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  subtle: SubtleCrypto | undefined = globalThis.crypto?.subtle
): Promise<string> {
  const [validatedWidth, validatedHeight] = requireTextureRevisionDimensions(
    width,
    height
  );
  requireTextureRevisionPixelLength(
    pixels,
    validatedWidth,
    validatedHeight
  );

  if (!subtle) {
    throw new Error(
      "Texture revision hashing requires Web Crypto SubtleCrypto support."
    );
  }

  const digest = await subtle.digest(
    "SHA-256",
    pixels as unknown as BufferSource
  );
  return `sha256:${validatedWidth}x${validatedHeight}:${digestHex(digest)}`;
}

export function requireTextureRevisionMatch(
  expectedRevision: string | undefined,
  actualRevision: string,
  context: string
): void {
  if (expectedRevision === undefined) return;
  if (expectedRevision !== actualRevision) {
    throw new Error(
      `${context} changed since the caller observed it. Expected revision ${expectedRevision}, actual ${actualRevision}. Refresh texture state before retrying the mutation.`
    );
  }
}
