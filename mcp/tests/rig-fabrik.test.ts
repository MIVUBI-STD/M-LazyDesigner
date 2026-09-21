import { describe, expect, test } from "bun:test";
import { solveFabrikChain } from "@/lib/rig/fabrik";

describe("FABRIK solver", () => {
  test("reaches a reachable target while preserving segment lengths", () => {
    const result = solveFabrikChain([[0,0,0],[1,0,0],[2,0,0]], [1,1,0]);
    expect(result.reached).toBe(true);
    const d0 = Math.hypot(...result.points[1].map((v,i) => v - result.points[0][i]) as [number,number,number]);
    const d1 = Math.hypot(...result.points[2].map((v,i) => v - result.points[1][i]) as [number,number,number]);
    expect(Math.abs(d0 - 1)).toBeLessThan(1e-6);
    expect(Math.abs(d1 - 1)).toBeLessThan(1e-6);
  });
});
