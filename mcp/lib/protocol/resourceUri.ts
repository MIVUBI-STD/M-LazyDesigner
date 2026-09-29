/**
 * Helpers for building and resolving human-readable MCP resource URIs.
 *
 * A resource URI looks like `scope://<id>`. Historically `<id>` was always the
 * element UUID, which is opaque. These helpers prefer a slugified element name
 * when it is unique among its siblings, falling back to a slug~uuid8 suffix on
 * collision, or the raw UUID if the name is missing or unprintable.
 *
 * The resolution side (`findByResourceId`) accepts any of:
 *   - raw UUID
 *   - raw name (exact unique match)
 *   - slug of the name (case-insensitive unique match)
 *   - slug~uuid8 format emitted on collision
 *
 * Ambiguous name/slug targets fail closed; callers must use UUID or the
 * collision-safe URI emitted by listing.
 */

const SLUG_MAX_LENGTH = 40;
const UUID_DISAMBIGUATOR_LENGTH = 8;

/**
 * Normalizes a display name into a URI-safe slug.
 * Returns an empty string when the input has no URI-safe characters.
 */
export function slugify(name: string | null | undefined): string {
  if (!name) return "";
  const normalized = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, "");
}

export interface INamedItem {
  uuid: string;
  name?: string | null;
  id?: string | number;
}

/**
 * Builds a human-readable ID fragment for a resource item.
 *
 * Preference order:
 *   1. `<slug>` when the slug is non-empty and unique among siblings
 *   2. `<slug>~<uuid8>` when the slug collides with another sibling
 *   3. `<uuid>` when the name is missing or produces an empty slug
 *
 * Use `makeResourceUri` to also prepend a scope; use `makeResourceId`
 * directly when the URI template is path-style (e.g. `hytale://attachments/{id}`).
 */
export function makeResourceId(
  item: INamedItem,
  siblings: readonly INamedItem[]
): string {
  const slug = slugify(item.name);
  if (!slug) return item.uuid;
  // UUID/name/native-ID precedence must not redirect a listed URI to a sibling.
  const avoidShadow = (candidate: string): string => siblings.some(sibling =>
    sibling.uuid !== item.uuid &&
    [sibling.uuid, sibling.name, sibling.id].includes(candidate)
  ) ? item.uuid : candidate;

  const collisionCount = siblings.reduce(
    (count, sibling) => (slugify(sibling.name) === slug ? count + 1 : count),
    0
  );

  if (collisionCount <= 1) {
    return avoidShadow(slug);
  }

  const suffix = item.uuid.slice(0, UUID_DISAMBIGUATOR_LENGTH);
  if (siblings.some(sibling => sibling.uuid !== item.uuid &&
      slugify(sibling.name) === slug && sibling.uuid.slice(0, UUID_DISAMBIGUATOR_LENGTH) === suffix)) {
    return item.uuid;
  }
  return avoidShadow(`${slug}~${suffix}`);
}

/**
 * Builds a `scope://<id>` URI using `makeResourceId`.
 * For path-style URIs, call `makeResourceId` directly and interpolate the result.
 */
export function makeResourceUri(
  scope: string,
  item: INamedItem,
  siblings: readonly INamedItem[]
): string {
  return `${scope}://${makeResourceId(item, siblings)}`;
}

function requireUniqueResourceMatch<T extends INamedItem>(
  matches: readonly T[],
  id: string,
  kind: "name" | "slug" | "collision-safe id"
): T | undefined {
  if (matches.length <= 1) return matches[0];
  throw new Error(
    `Resource id "${id}" is ambiguous by ${kind}; use the raw UUID or a collision-safe listed URI.`
  );
}

/**
 * Resolves an ID fragment (from a URI variable) against a list of items.
 * UUID wins first; name/slug fallbacks must resolve uniquely.
 */
export function findByResourceId<T extends INamedItem>(
  items: readonly T[],
  id: string | null | undefined
): T | undefined {
  if (!id) return undefined;

  const uuidMatch = items.find((item) => item.uuid === id);
  if (uuidMatch) return uuidMatch;

  const exactNameMatch = requireUniqueResourceMatch(
    items.filter((item) => item.name === id),
    id,
    "name"
  );
  if (exactNameMatch) return exactNameMatch;

  const tildeIndex = id.indexOf("~");
  if (tildeIndex > 0) {
    const slugPart = id.slice(0, tildeIndex).toLowerCase();
    const uuidPart = id.slice(tildeIndex + 1);
    const collisionSafeMatch = requireUniqueResourceMatch(
      items.filter(
        (item) =>
          slugify(item.name) === slugPart && item.uuid.startsWith(uuidPart)
      ),
      id,
      "collision-safe id"
    );
    if (collisionSafeMatch) return collisionSafeMatch;
  }

  const slugLower = id.toLowerCase();
  return requireUniqueResourceMatch(
    items.filter((item) => item.name && slugify(item.name) === slugLower),
    id,
    "slug"
  );
}
