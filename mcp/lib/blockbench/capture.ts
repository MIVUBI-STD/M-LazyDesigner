/// <reference types="blockbench-types" />

import { imageContent } from "@/lib/protocol/imageContent";

export function captureScreenshot() {
  if (!Project) {
    throw new Error("No active project found in the Blockbench editor.");
  }

  const preview = Preview.selected;
  if (!preview) {
    throw new Error("No preview available for the selected project.");
  }

  let dataUrl: string | undefined;
  Canvas.withoutGizmos(() => {
    preview.render();
    dataUrl = preview.canvas.toDataURL();
  });

  if (!dataUrl) {
    throw new Error("Failed to capture preview screenshot.");
  }

  return imageContent(dataUrl, "image/png");
}

export async function captureAppScreenshot(): Promise<ReturnType<typeof imageContent>> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("App screenshot timed out after 5 seconds."));
      }
    }, 5000);

    // @ts-ignore - Screencam.fullScreen callback type is incomplete in public typings.
    Screencam.fullScreen({}, (dataUrl: string) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        if (dataUrl) resolve(imageContent(dataUrl, "image/png"));
        else reject(new Error("Failed to capture app screenshot - no data returned."));
      }
    });
  });
}
