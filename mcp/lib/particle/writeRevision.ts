export type ParticleWriteRevisionFilesystem = {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
};

export type ParticleWriteRevision = {
  existed: boolean;
  content: string | null;
};

export function captureParticleWriteRevision(
  fs: ParticleWriteRevisionFilesystem,
  path: string
): ParticleWriteRevision {
  if (!fs.existsSync(path)) {
    return { existed: false, content: null };
  }
  return {
    existed: true,
    content: fs.readFileSync(path, "utf8"),
  };
}

export function assertParticleWriteRevisionUnchanged(
  fs: ParticleWriteRevisionFilesystem,
  path: string,
  revision: ParticleWriteRevision,
  label = "particle artifact"
): void {
  const existsNow = fs.existsSync(path);
  if (revision.existed !== existsNow) {
    throw new Error(
      `STALE_TARGET: ${label} ${path} ${revision.existed ? "disappeared" : "appeared"} while the write transaction was being prepared.`
    );
  }
  if (!revision.existed) return;
  const contentNow = fs.readFileSync(path, "utf8");
  if (contentNow !== revision.content) {
    throw new Error(
      `STALE_TARGET: ${label} ${path} changed while the write transaction was being prepared.`
    );
  }
}

export function assertParticleSourceSnapshotMatches(
  revision: ParticleWriteRevision,
  expectedContent: string | undefined,
  path: string,
  label = "particle artifact"
): void {
  if (expectedContent === undefined) return;
  if (!revision.existed || revision.content !== expectedContent) {
    throw new Error(
      `STALE_SOURCE: ${label} ${path} changed after BlockIT read it; re-inspect the current file before applying the mutation.`
    );
  }
}
