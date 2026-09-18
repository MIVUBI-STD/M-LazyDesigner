import { describe, expect, test } from "bun:test";

describe("Runtime project-affinity dispatch ordering", () => {
  test("queued tool calls re-check socket liveness before entering native project dispatch", async () => {
    const source = await Bun.file("server/net.ts").text();
    const queue = source.indexOf("runRuntimeOperationExclusive(generation, async () => {");
    const liveness = source.indexOf("request.aborted ||", queue);
    const responseLiveness = source.indexOf("response.destroyed ||", liveness);
    const shutdownLiveness = source.indexOf("shuttingDown", responseLiveness);
    const dispatch = source.indexOf("return await dispatch()", shutdownLiveness);
    const abandonedCatch = source.indexOf(
      "error instanceof RuntimeRequestAbandonedError",
      dispatch
    );
    const retiredCatch = source.indexOf(
      "error instanceof RuntimeGenerationRetiredError",
      abandonedCatch
    );
    const projectErrorCatch = source.indexOf(
      "if (error instanceof RuntimeProjectContextError",
      retiredCatch
    );

    expect(queue).toBeGreaterThan(-1);
    expect(liveness).toBeGreaterThan(queue);
    expect(responseLiveness).toBeGreaterThan(liveness);
    expect(shutdownLiveness).toBeGreaterThan(responseLiveness);
    expect(dispatch).toBeGreaterThan(shutdownLiveness);
    expect(abandonedCatch).toBeGreaterThan(dispatch);
    expect(retiredCatch).toBeGreaterThanOrEqual(abandonedCatch);
    expect(projectErrorCatch).toBeGreaterThan(retiredCatch);
  });
});
