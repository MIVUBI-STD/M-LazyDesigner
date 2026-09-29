import {
  assertParticleSourceSnapshotMatches,
  assertParticleWriteRevisionUnchanged,
  captureParticleWriteRevision,
} from "@/lib/particle/writeRevision";

export type ParticleFilesystem = {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
  writeFileSync(path: string, data: string): void;
  statSync(path: string): { isFile(): boolean; size: number };
  renameSync(oldPath: string, newPath: string): void;
  unlinkSync(path: string): void;
};

export type PlannedParticleWrite = {
  kind: "particle";
  path: string;
  content: string;
  allow_replace: boolean;
  expected_existing_content?: string;
};

export type ParticleWriteReceipt = {
  kind: PlannedParticleWrite["kind"];
  path: string;
  byte_length: number;
  replaced_existing: boolean;
};

export function requireParticleFilesystem(reason: string): ParticleFilesystem {
  // @ts-ignore - Blockbench desktop provides fs through requireNativeModule.
  const fs = requireNativeModule("fs", {
    message: reason,
  }) as ParticleFilesystem | undefined;

  if (!fs) {
    throw new Error(
      "File system access was denied. Pass inline source.content for reads or omit output paths to receive compiled JSON content."
    );
  }

  return fs;
}

export function normalizeParticlePathIdentity(path: string): string {
  let normalized = path
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");

  if (/^[A-Za-z]:\//.test(normalized) || path.startsWith("\\\\")) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

function uniqueSiblingPath(
  fs: ParticleFilesystem,
  targetPath: string,
  label: "tmp" | "bak"
): string {
  for (let index = 0; index < 128; index += 1) {
    const candidate =
      `${targetPath}.blockit-${label}-${process.pid}-${index}`;
    if (!fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Could not allocate a bounded temporary ${label} path beside ${targetPath}.`
  );
}

function cleanupIfPresent(
  fs: ParticleFilesystem,
  path: string
): void {
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

export function writeParticleArtifactsAtomically(
  plans: readonly PlannedParticleWrite[]
): ParticleWriteReceipt[] {
  if (plans.length === 0) return [];

  const pathIdentities = new Set<string>();
  for (const plan of plans) {
    const identity = normalizeParticlePathIdentity(plan.path);
    if (pathIdentities.has(identity)) {
      throw new Error(
        `Multiple particle artifacts target the same output path: ${plan.path}.`
      );
    }
    pathIdentities.add(identity);
  }

  const fs = requireParticleFilesystem(
    `BlockIT requested write access for ${plans.length} validated Bedrock particle artifact${plans.length === 1 ? "" : "s"}`
  );

  const prepared = plans.map((plan) => {
    const revision = captureParticleWriteRevision(fs, plan.path);
    const existed = revision.existed;

    if (existed && !plan.allow_replace) {
      throw new Error(
        `Refusing to replace existing ${plan.kind} file ${plan.path} without overwrite=true.`
      );
    }

    assertParticleSourceSnapshotMatches(
      revision,
      plan.expected_existing_content,
      plan.path,
      plan.kind
    );

    return {
      ...plan,
      existed,
      revision,
      byte_length: Buffer.byteLength(plan.content, "utf8"),
      temp_path: uniqueSiblingPath(fs, plan.path, "tmp"),
      backup_path: existed
        ? uniqueSiblingPath(fs, plan.path, "bak")
        : null,
      committed: false,
      backup_moved: false,
    };
  });

  try {
    for (const item of prepared) {
      fs.writeFileSync(item.temp_path, item.content);
      const stat = fs.statSync(item.temp_path);
      if (!stat.isFile() || stat.size !== item.byte_length) {
        throw new Error(
          `Temporary ${item.kind} write verification failed for ${item.path}: expected ${item.byte_length} bytes, got ${stat.isFile() ? stat.size : "a non-file target"}.`
        );
      }
    }

    for (const item of prepared) {
      assertParticleWriteRevisionUnchanged(
        fs,
        item.path,
        item.revision,
        item.kind
      );

      if (item.existed && item.backup_path) {
        fs.renameSync(item.path, item.backup_path);
        item.backup_moved = true;
      }

      try {
        fs.renameSync(item.temp_path, item.path);
        item.committed = true;
      } catch (error) {
        if (
          item.backup_moved &&
          item.backup_path &&
          fs.existsSync(item.backup_path)
        ) {
          fs.renameSync(item.backup_path, item.path);
          item.backup_moved = false;
        }
        throw error;
      }

      const stat = fs.statSync(item.path);
      if (!stat.isFile() || stat.size !== item.byte_length) {
        throw new Error(
          `Committed ${item.kind} write verification failed for ${item.path}: expected ${item.byte_length} bytes, got ${stat.isFile() ? stat.size : "a non-file target"}.`
        );
      }
    }
  } catch (error) {
    const rollbackErrors: string[] = [];

    for (const item of [...prepared].reverse()) {
      try {
        cleanupIfPresent(fs, item.temp_path);
        if (item.committed) cleanupIfPresent(fs, item.path);

        if (
          item.backup_moved &&
          item.backup_path &&
          fs.existsSync(item.backup_path)
        ) {
          fs.renameSync(item.backup_path, item.path);
          item.backup_moved = false;
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
        );
      }
    }

    const reason =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      rollbackErrors.length > 0
        ? `${reason} Rollback also reported: ${rollbackErrors.join(" | ")}`
        : reason
    );
  }

  const receipts: ParticleWriteReceipt[] = prepared.map((item) => ({
    kind: item.kind,
    path: item.path,
    byte_length: item.byte_length,
    replaced_existing: item.existed,
  }));

  for (const item of prepared) {
    if (item.backup_path) cleanupIfPresent(fs, item.backup_path);
  }

  return receipts;
}

export function particleSourceContentForOutput(
  sourcePath: string | null,
  sourceContent: string | null,
  outputPath: string
): string | undefined {
  return sourcePath !== null &&
    sourceContent !== null &&
    normalizeParticlePathIdentity(sourcePath) ===
      normalizeParticlePathIdentity(outputPath)
    ? sourceContent
    : undefined;
}

export function allowParticleReplaceForExplicitSource(
  sourcePath: string | null,
  outputPath: string,
  overwrite: boolean
): boolean {
  return (
    overwrite === true ||
    (sourcePath !== null &&
      normalizeParticlePathIdentity(sourcePath) ===
        normalizeParticlePathIdentity(outputPath))
  );
}
