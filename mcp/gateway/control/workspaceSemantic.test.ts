import { describe, expect, test } from "bun:test";
import { mkdtemp, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileMetadataSignature } from "./fileSignature";
import { readWorkspaceProjection } from "./workspace";
import type { GatewayRuntimeStatus } from "../runtime/backend";
import {
  workspaceSemanticFingerprint,
  workspaceSemanticState,
} from "./workspace";

describe("workspace semantic fingerprint", () => {
  const base = [
    "# Chair",
    "Current Stage: Texturing",
    "Geometry: APPROVED",
    "UV Layout: PASS",
    "Texturing: IN_PROGRESS",
    "Animation: NOT_STARTED",
    "Current next step: paint seat",
    "Known blocker(s): none",
  ].join("\n");

  test("ignores unrelated prose and formatting outside lifecycle fields", () => {
    const changedProse = [
      "# Chair",
      "",
      "This paragraph is documentation only and may change freely.",
      "",
      "Current Stage: Texturing",
      "Geometry: APPROVED",
      "UV Layout: PASS",
      "Texturing: IN_PROGRESS",
      "Animation: NOT_STARTED",
      "Current next step: paint seat",
      "Known blocker(s): none",
      "",
      "More notes.",
    ].join("\n");

    expect(workspaceSemanticFingerprint(base)).toBe(
      workspaceSemanticFingerprint(changedProse)
    );
  });

  test("changes when a lifecycle field changes", () => {
    const changed = base.replace(
      "Texturing: IN_PROGRESS",
      "Texturing: APPROVED"
    );
    expect(workspaceSemanticFingerprint(base)).not.toBe(
      workspaceSemanticFingerprint(changed)
    );
  });

  test("same-size same-mtime README replacement invalidates cached approval gates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lazydesigner-workspace-refresh-"));
    const readme = join(dir, "README.md");
    const replacement = join(dir, "replacement.md");
    const when = new Date("2024-01-01T00:00:00.000Z");
    const approved = "# Chair\nGeometry: APPROVED\nUV Layout: PASS\n";
    const revoked = "# Chair\nGeometry: REJECTED\nUV Layout: FAIL\n";
    const status = {
      affinity: { project_uuid: null },
      runtime: { health: null },
    } as unknown as GatewayRuntimeStatus;

    try {
      expect(Buffer.byteLength(approved)).toBe(Buffer.byteLength(revoked));
      await writeFile(readme, approved);
      await utimes(readme, when, when);
      const firstStat = await stat(readme);
      const first = await readWorkspaceProjection(status, dir);
      expect(first.gates.geometry).toBe("APPROVED");
      expect(first.gates.uv_layout).toBe("PASS");
      expect(await readWorkspaceProjection(status, dir)).toBe(first);

      await writeFile(replacement, revoked);
      await utimes(replacement, when, when);
      await rename(replacement, readme);
      const secondStat = await stat(readme);
      expect(secondStat.size).toBe(firstStat.size);
      expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
      expect(fileMetadataSignature(secondStat)).not.toBe(
        fileMetadataSignature(firstStat)
      );

      const second = await readWorkspaceProjection(status, dir);
      expect(second.gates.geometry).toBe("REJECTED");
      expect(second.gates.uv_layout).toBe("FAIL");
      expect(second.fingerprint).not.toBe(first.fingerprint);
      expect(await readWorkspaceProjection(status, dir)).toBe(second);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("semantic state owns exactly the Control lifecycle fields", () => {
    expect(workspaceSemanticState(base)).toEqual({
      asset: "Chair",
      current_stage: "Texturing",
      gates: {
        geometry: "APPROVED",
        uv_layout: "PASS",
        texturing: "IN_PROGRESS",
        animation: "NOT_STARTED",
      },
      next_step: "paint seat",
      blockers: [],
    });
  });
});
