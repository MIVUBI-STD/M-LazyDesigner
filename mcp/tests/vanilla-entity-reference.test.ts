import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { classifyCapabilityTier } from "@/gateway/contract";
import {
  VANILLA_ENTITY_REFERENCE_CAPABILITY,
  VANILLA_ENTITY_REFERENCE_TOOL,
  VanillaEntityReferenceError,
  VanillaEntityReferenceProvider,
  shouldProbeVanillaEntityReference,
} from "@/gateway/vanillaEntityReference";

const cleanupPaths: string[] = [];
afterEach(async () => {
  while (cleanupPaths.length > 0) {
    const path = cleanupPaths.pop()!;
    await rm(path, { recursive: true, force: true });
  }
});

function deflatedZip(entries: Record<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const [name, text] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(text, "utf8");
    const compressed = deflateRawSync(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBytes);

    localOffset += local.length + nameBytes.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

async function fixtureArchive(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "blockit-vanilla-reference-"));
  cleanupPaths.push(directory);
  const archivePath = join(directory, "v1.26.40.05.zip");
  const geometry = {
    format_version: "1.12.0",
    "minecraft:geometry": [
      {
        description: {
          identifier: "geometry.cow.v2",
          texture_width: 64,
          texture_height: 64,
          visible_bounds_width: 2,
          visible_bounds_height: 2,
          visible_bounds_offset: [0, 1, 0],
        },
        bones: [
          {
            name: "body",
            pivot: [0, 12, 0],
            cubes: [{ origin: [-6, 6, -8], size: [12, 10, 16], uv: [0, 0] }],
          },
          {
            name: "head",
            parent: "body",
            pivot: [0, 12, -8],
            cubes: [{ origin: [-4, 10, -14], size: [8, 8, 6], uv: [0, 26] }],
          },
        ],
      },
      {
        description: {
          identifier: "geometry.cow.warm",
          texture_width: 64,
          texture_height: 64,
        },
        bones: [
          {
            name: "body",
            pivot: [0, 12, 0],
            cubes: [{ origin: [-7, 6, -8], size: [14, 10, 16], uv: [0, 0] }],
          },
        ],
      },
    ],
  };
  const zip = deflatedZip({
    "bedrock-samples-v1.26.40.05/resource_pack/models/entity/cow.geo.json":
      JSON.stringify(geometry),
  });
  await writeFile(archivePath, zip);
  return archivePath;
}

describe("lazy vanilla Bedrock entity reference", () => {
  test("stays a support capability and only probes on explicit vanilla intent", () => {
    expect(VANILLA_ENTITY_REFERENCE_CAPABILITY).toBe("get_vanilla_entity_reference");
    expect(classifyCapabilityTier(VANILLA_ENTITY_REFERENCE_TOOL)).toBe("support");
    expect(VANILLA_ENTITY_REFERENCE_TOOL.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(shouldProbeVanillaEntityReference("create a custom lift")).toBe(false);
    expect(shouldProbeVanillaEntityReference("use vanilla cow proportions")).toBe(true);
  });

  test("reads one cached model lazily and returns compact staged detail", async () => {
    const archivePath = await fixtureArchive();
    const provider = new VanillaEntityReferenceProvider({ archivePath });

    expect(await provider.isAvailable()).toBe(true);

    const summary = await provider.invoke({ entity: "minecraft:cow" });
    expect(summary.structuredContent).toMatchObject({
      entity: "minecraft:cow",
      geometry: {
        identifier: "geometry.cow.v2",
        texture_size: [64, 64],
      },
      summary: {
        bone_count: 2,
        cube_count: 2,
        root_bones: ["body"],
      },
    });
    expect(summary.structuredContent).not.toHaveProperty("bones");

    const rig = await provider.invoke({ entity: "cow", detail: "rig" });
    expect((rig.structuredContent.bones as Array<Record<string, unknown>>)).toEqual([
      {
        name: "body",
        pivot: [0, 12, 0],
        cube_count: 1,
      },
      {
        name: "head",
        parent: "body",
        pivot: [0, 12, -8],
        cube_count: 1,
      },
    ]);

    const head = await provider.invoke({
      entity: "cow",
      detail: "geometry",
      bone: "head",
    });
    const headBones = head.structuredContent.bones as Array<Record<string, any>>;
    expect(headBones).toHaveLength(1);
    expect(headBones[0]?.name).toBe("head");
    expect(headBones[0]?.cubes?.[0]).toMatchObject({
      origin: [-4, 10, -14],
      size: [8, 8, 6],
      uv: [0, 26],
    });
  });

  test("selects an internal geometry variant without requiring a second model file", async () => {
    const provider = new VanillaEntityReferenceProvider({
      archivePath: await fixtureArchive(),
    });
    const warm = await provider.invoke({ entity: "cow", variant: "warm" });
    expect(warm.structuredContent.geometry).toMatchObject({
      identifier: "geometry.cow.warm",
    });
    expect(warm.structuredContent.summary).toMatchObject({
      bone_count: 1,
      cube_count: 1,
    });
  });

  test("fails closed when the optional cache source is unavailable", async () => {
    const provider = new VanillaEntityReferenceProvider({
      archivePath: join(tmpdir(), "missing-blockit-vanilla-reference.zip"),
    });
    expect(await provider.isAvailable()).toBe(false);
    await expect(provider.invoke({ entity: "cow" })).rejects.toMatchObject({
      code: "REFERENCE_SOURCE_UNAVAILABLE",
    } satisfies Partial<VanillaEntityReferenceError>);
  });

  test("Gateway wiring keeps the rare reference behind existing four-tool discovery", async () => {
    const source = await Bun.file("gateway/localCapabilities.ts").text();
    expect(source).toContain("LocalCapabilityRegistry");
    expect(source).toContain("VANILLA_ENTITY_REFERENCE_TOOL");
    expect(source).toContain("shouldProbe: shouldProbeVanillaEntityReference");
    expect(source).toContain("isAvailable: () => vanilla.isAvailable()");
    expect(source).toContain("invoke: (args) => vanilla.invoke(args)");
    expect(source).not.toContain('registerGatewayTool(\n  "get_vanilla_entity_reference"');
  });
});
