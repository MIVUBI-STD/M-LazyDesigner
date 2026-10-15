import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "../gateway/control/delta/engine";
import { projectControlDeltaForGateway } from "../gateway/control/delta/projection";

function exportDelta(result: unknown, succeeded = true) {
  return buildControlDelta({
    capability: "export_model",
    phaseBefore: "geometry",
    phaseAfter: "geometry",
    projectUuid: "project-fixture",
    succeeded,
    result,
  });
}

describe("export_model native metadata delta", () => {
  test("Save As changes are visible without invalidating visual freshness", () => {
    const delta = exportDelta({
      save_behavior: "NATIVE_PROJECT_SAVE_AS",
      project_lifecycle_changes: ["name", "save_path", "saved"],
    });
    expect(delta.changed).toEqual(["project.name", "project.save_path", "project.saved"]);
    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.requires_status_refresh).toBe(true);
    const client = projectControlDeltaForGateway(delta);
    expect(client.changed).toEqual(delta.changed);
    expect(client.freshness).toEqual({ basis: "NO_CHANGE" });
  });

  test("unmodified compile-only receipt does not claim a project change", () => {
    const delta = exportDelta({
      save_behavior: "COMPILE_ONLY", project_lifecycle_changes: [],
    });
    expect(delta.changed).toEqual([]);
    expect(delta.requires_status_refresh).toBe(false);
  });

  test("untrusted fields and failed saves never fabricate project changes", () => {
    const receipt = { project_lifecycle_changes: ["save_path", "token", "", 123] };
    expect(exportDelta(receipt).changed).toEqual(["project.save_path"]);
    expect(exportDelta(receipt, false).changed).toEqual([]);
  });

  test("legacy Runtime receipt without metadata remains compatible", () => {
    expect(exportDelta({ wrote_to_path: "/tmp/file.bbmodel" }).changed).toEqual([]);
  });
});
