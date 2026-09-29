import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import {
  COMPATIBILITY_ROOT_DOMAIN_FILES,
  MIGRATED_COMPATIBILITY_WRAPPERS,
} from "./lib-domain-compatibility";

const DOMAIN_PREFIX = /^(?:animation|geometry|particle|texture|uv)[A-Z].*\.ts$/;


describe("lib domain ownership ratchet", () => {
  test("migrated root paths stay compatibility-only wrappers", async () => {
    for (const [name, expected] of Object.entries(
      MIGRATED_COMPATIBILITY_WRAPPERS
    )) {
      expect(await Bun.file(`lib/${name}`).text()).toBe(expected);
    }
  });

  test("new domain implementation does not accumulate at lib root", async () => {
    const entries = await readdir("lib", { withFileTypes: true });
    const rootDomainFiles = entries
      .filter((entry) => entry.isFile() && DOMAIN_PREFIX.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    const unexpected = rootDomainFiles.filter(
      (name) => !COMPATIBILITY_ROOT_DOMAIN_FILES.has(name)
    );

    expect(unexpected).toEqual([]);
  });

  test("compatibility wrapper registry only names files that still exist", async () => {
    const entries = new Set(
      (await readdir("lib", { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    );

    const stale = [...COMPATIBILITY_ROOT_DOMAIN_FILES].filter(
      (name) => !entries.has(name)
    );

    // A retired compatibility path must leave the registry in the same change,
    // so one canonical map remains the complete root compatibility surface.
    expect(stale).toEqual([]);
  });
});
