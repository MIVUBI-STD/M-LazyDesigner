import { describe, expect, test } from "bun:test";
import {
  CAPABILITY_CORE_MANIFEST,
  capabilityOperationClassByName,
} from "@/lib/capabilities/manifest";
import { getCapabilityMetadata } from "@/lib/capabilityMetadata";

describe("capability semantic operation metadata", () => {
  test("every canonical capability resolves a non-UNKNOWN operation class", () => {
    for (const name of CAPABILITY_CORE_MANIFEST.keys()) {
      expect(capabilityOperationClassByName(name), name).not.toBe("UNKNOWN");
    }
  });

  test("authored state classes default to MUTATION without a duplicate name registry", () => {
    for (const [name, entry] of CAPABILITY_CORE_MANIFEST) {
      if (entry.stateClass && entry.operationClass === undefined) {
        expect(capabilityOperationClassByName(name), name).toBe("MUTATION");
      }
    }
  });

  test("explicit non-authored classes remain semantically distinct", () => {
    expect(getCapabilityMetadata("inspect_elements").operationClass).toBe("QUERY");
    expect(getCapabilityMetadata("capture_model_views").operationClass).toBe("PREVIEW");
    expect(getCapabilityMetadata("export_model").operationClass).toBe("EXPORT");
    expect(getCapabilityMetadata("switch_authoring_phase").operationClass).toBe("CONTROL");
    expect(getCapabilityMetadata("activate_texture").operationClass).toBe("CONTROL");
    expect(getCapabilityMetadata("future_unknown_tool").operationClass).toBe("UNKNOWN");
  });

  test("existing state execution and verification metadata remain canonical", () => {
    expect(getCapabilityMetadata("manage_cubes")).toMatchObject({
      operationClass: "MUTATION",
      stateClass: "geometry",
      executionClass: "normal",
      verificationClass: "visual",
    });
  });
});
