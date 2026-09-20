import { describe, expect, test } from "bun:test";
import {
  buildDevelopmentSymbolMap,
  mapTypeScriptSource,
} from "@/scripts/build-development-symbol-map";

describe("bounded development symbol map", () => {
  test("maps signatures/imports without leaking implementation bodies", () => {
    const source = `
      import { helper } from "./helper";
      export type Mode = "a" | "b";
      export interface Config { value: string }
      export const LIMIT: number = 4;
      export function route(input: string): number {
        const body_secret = "do-not-include";
        return body_secret.length + input.length;
      }
      class Internal {
        execute(value: number) { return value * 2; }
      }
    `;
    const mapped = mapTypeScriptSource(source, "fixture.ts");
    const serialized = JSON.stringify(mapped);

    expect(mapped.imports).toEqual(["./helper"]);
    expect(mapped.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining(["Mode", "Config", "LIMIT", "route", "Internal"])
    );
    expect(serialized).not.toContain("do-not-include");
    expect(serialized).not.toContain("body_secret");
    expect(serialized).not.toContain("return value * 2");
    expect(
      mapped.symbols.find((symbol) => symbol.name === "route")?.signature
    ).toContain("route(input: string): number");
  });

  test("real cross-owner map remains bounded and source-owner scoped", async () => {
    const report = await buildDevelopmentSymbolMap(
      "gateway control routing continuation runtime",
      4000
    );

    expect(report.proof_scope).toBe("SYSTEM_DEVELOPMENT_LOCAL_CONTEXT");
    expect(report.bytes).toBeLessThanOrEqual(4000);
    expect(report.files.length).toBeGreaterThan(0);
    for (const file of report.files) {
      expect(file.path).toMatch(/^mcp\//);
      expect(file.symbols.length).toBeLessThanOrEqual(24);
    }
  });
});
