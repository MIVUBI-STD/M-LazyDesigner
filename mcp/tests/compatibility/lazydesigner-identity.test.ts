import { expect, test } from "bun:test";
import { LAZYDESIGNER_IDENTITY, requireMatchingLazyDesignerComponents, type LazyDesignerComponentIdentity } from "../../compatibility/lazydesigner-identity";

const identity: LazyDesignerComponentIdentity = {
  product_id: LAZYDESIGNER_IDENTITY.runtimeProductId,
  source_sha: "a".repeat(40),
  build_identity: `sha256:${"b".repeat(64)}`,
  plugin_id: "lazydesigner_mcp",
  client_server_key: "lazydesigner",
};

test("only matching canonical components can be considered compatible", () => {
  expect(() => requireMatchingLazyDesignerComponents(identity, { ...identity })).not.toThrow();
  expect(() => requireMatchingLazyDesignerComponents(identity, {
    ...identity, product_id: "blockit-bedrock-entity-mcp" as "lazydesigner-bedrock-entity-mcp"
  })).toThrow(/Invalid LazyDesigner component identity/);
  expect(() => requireMatchingLazyDesignerComponents(identity, { ...identity, source_sha: "c".repeat(40) })).toThrow();
  expect(() => requireMatchingLazyDesignerComponents(identity, { ...identity, build_identity: `sha256:${"c".repeat(64)}` })).toThrow();
  expect(() => requireMatchingLazyDesignerComponents(identity, { ...identity, plugin_id: "blockit_mcp" as "lazydesigner_mcp" })).toThrow();
  expect(() => requireMatchingLazyDesignerComponents(identity, { ...identity, client_server_key: "blockit" as "lazydesigner" })).toThrow();
});
