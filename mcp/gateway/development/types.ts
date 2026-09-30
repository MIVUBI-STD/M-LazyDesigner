export type DevelopmentSourceOwner = {
  source: string;
  specialist: string | null;
  /** Canonical bounded regression anchor. This is not the full proof surface. */
  anchor_test: string | null;
  /** Omitted on explicit owners; FALLBACK means bounded orientation only. */
  resolution?: "FALLBACK";
};
