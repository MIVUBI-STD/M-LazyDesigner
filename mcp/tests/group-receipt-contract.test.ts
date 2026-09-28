import { describe, expect, test } from "bun:test";
import {
  addGroupReceipt,
  isGroupMutationReceipt,
  modifyGroupReceipt,
  reparentElementReceipt,
} from "@/lib/receipts/groupMutation";

const group = {
  uuid: "group-a",
  name: "arm",
  origin: [0, 12, 0],
  rotation: [0, 0, 0],
  visibility: true,
  parent: "root",
};

describe("shared group mutation receipt contract", () => {
  test("accepts add, bounded modify, and reparent final state", () => {
    expect(
      isGroupMutationReceipt(
        "add_group",
        addGroupReceipt({
          execution: "applied",
          groups: [group],
          group,
        })
      )
    ).toBe(true);

    expect(
      isGroupMutationReceipt(
        "modify_group",
        modifyGroupReceipt({
          execution: "applied",
          id: "group-a",
          name: "arm",
          changed_fields: ["rotation"],
          group: {
            ...group,
            rotation: [0, 45, 0],
          },
        })
      )
    ).toBe(true);

    expect(
      isGroupMutationReceipt(
        "reparent_element",
        reparentElementReceipt({
          execution: "applied",
          id: "group-a",
          name: "arm",
          previous_parent: "root",
          parent: "body",
          transform_policy: "preserve_local",
        })
      )
    ).toBe(true);
  });

  test("subtree translation summary is intentionally not a complete modify receipt", () => {
    expect(
      isGroupMutationReceipt("modify_group", {
        execution: "applied",
        id: "group-a",
        offset: [1, 0, 0],
        origin: [1, 12, 0],
        groups: 4,
        elements: 8,
        coordinate_space: "authored_model",
      })
    ).toBe(false);
  });

  test("rejects mismatched final group identity", () => {
    expect(
      isGroupMutationReceipt("modify_group", {
        execution: "applied",
        id: "group-a",
        name: "arm",
        changed_fields: ["rotation"],
        group: {
          ...group,
          uuid: "group-b",
        },
      })
    ).toBe(false);
  });

  test("Runtime and Control share the group receipt owner", async () => {
    const producer = await Bun.file("server/tools/element-hierarchy.ts").text();
    const control = await Bun.file("gateway/control/delta/receipts.ts").text();

    expect(producer).toContain('from "@/lib/receipts/groupMutation"');
    expect(producer).toContain("const result = addGroupReceipt({");
    expect(producer).toContain("structuredContent: modifyGroupReceipt({");
    expect(producer).toContain("structuredContent: reparentElementReceipt({");
    expect(control).toContain(
      'from "../../../lib/receipts/groupMutation"'
    );
    expect(control).toContain("isGroupMutationReceipt(capability, candidate)");
  });
});
