import { describe, expect, test } from "bun:test";
import {
  buildModelViewReferenceComparison,
  captureModelViewsParameters,
  modelViewReferenceContract,
  prepareOffscreenPreview,
} from "@/server/tools/camera";

const baseInput = {
  views: ["front"],
  front_direction: "+z",
} as const;

describe("capture_model_views explicit framing contract", () => {
  test("icon sizes resize both native projection bases and preserve default comparisons",()=>{
    expect(captureModelViewsParameters.parse(baseInput).size).toBe(512);
    for(const size of [32,48,512,1024]){
      const input=captureModelViewsParameters.parse({...baseInput,size});
      let dimensions:number[]=[];
      const preview={resize:(w:number,h:number)=>{dimensions=[w,h];},camPers:{aspect:0,updateProjectionMatrix(){}},camOrtho:{left:0,right:0,top:0,bottom:0,updateProjectionMatrix(){}}};
      prepareOffscreenPreview(preview as any,input.size);
      expect(dimensions).toEqual([size,size]);expect(preview.camPers.aspect).toBe(1);
      expect([preview.camOrtho.left,preview.camOrtho.right,preview.camOrtho.top,preview.camOrtho.bottom]).toEqual([-size/80,size/80,size/80,-size/80]);
    }
    for(const size of [0,31,1025,48.5])expect(captureModelViewsParameters.safeParse({...baseInput,size}).success).toBe(false);
  });
  test("uses overflow-safe midpoint math for accepted explicit envelopes", async () => {
    const cameraSource = await Bun.file(new URL("../server/tools/camera.ts", import.meta.url)).text();
    expect(cameraSource).toContain("min[0] + size[0] / 2");
    expect(cameraSource).toContain("min[1] + size[1] / 2");
    expect(cameraSource).toContain("min[2] + size[2] / 2");
    expect(cameraSource).not.toContain("(min[0] + max[0]) / 2");
    expect(cameraSource).toContain("this tool does not judge resemblance");
  });

  test("keeps model and explicit framing Cube-owned after retirement of 3D-assisted evidence", async () => {
    const cameraSource = await Bun.file(
      new URL("../server/tools/camera.ts", import.meta.url)
    ).text();
    expect(cameraSource).not.toContain("BlockItThreeDAssistedReference");
    expect(cameraSource).not.toContain("3D-Assisted Evidence");
    expect(cameraSource).toContain('framingInput.mode === "model"');
    expect(cameraSource).toContain("Model framing requires visible Cube geometry");
    expect(cameraSource).toContain("Explicit framing requires visible Cube geometry to capture.");
  });

  test("accepts a finite positive target envelope", () => {
    const result = captureModelViewsParameters.safeParse({
      ...baseInput,
      framing: {
        mode: "explicit",
        min: [-16, 0, -8],
        max: [16, 32, 8],
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid or non-finite framing math before camera runtime", () => {
    const invalidFramings = [
      { mode: "explicit", min: [0, 0, 0], max: [Number.POSITIVE_INFINITY, 16, 16] },
      { mode: "explicit", min: [-1e308, 0, 0], max: [1e308, 16, 16] },
      { mode: "explicit", min: [0, 0, 0], max: [0, 16, 16] },
    ];
    for (const framing of invalidFramings) {
      const result = captureModelViewsParameters.safeParse({ ...baseInput, framing });
      expect(result.success).toBe(false);
    }
  });

  test("maps canonical captures to the approved five-preview board without scoring resemblance", () => {
    const comparison = buildModelViewReferenceComparison([
      "front",
      "left",
      "top",
      "back",
      "front_left_3q",
    ]);

    expect(comparison.board_layout).toBe(
      "UPPER:LEFT|FRONT|BACK;LOWER:TOP|FRONT_LEFT_3Q"
    );
    expect(comparison.visual_verdict).toBe("not_evaluated");
    expect(comparison.difference_first).toBe(true);
    expect(comparison.views.map((entry) => entry.reference_slot)).toEqual([
      "upper_front",
      "upper_left",
      "lower_top",
      "upper_back",
      "lower_front_left_3q",
    ]);
    expect(modelViewReferenceContract("left").primary_evidence).toContain("depth");
    expect(modelViewReferenceContract("right").reference_slot).toBeNull();
  });

  test("DIRECT core-view triad carries complete canonical correspondence without forcing five captures", () => {
    const comparison = buildModelViewReferenceComparison(["front", "left", "top"]);
    expect(comparison.views).toHaveLength(3);
    expect(comparison.views.map((entry) => entry.reference_slot)).toEqual([
      "upper_front",
      "upper_left",
      "lower_top",
    ]);
    expect(comparison.views.flatMap((entry) => entry.primary_evidence)).toEqual(
      expect.arrayContaining(["width", "height", "length", "depth", "negative_space"])
    );
    expect(comparison.visual_verdict).toBe("not_evaluated");
  });
});
