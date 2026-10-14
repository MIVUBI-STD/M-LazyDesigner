import { expect, test } from "bun:test";

test("native fault injection cannot enter release builds or the default feature set", async () => {
  const cargo = Bun.TOML.parse(await Bun.file("../apps/desktop/src-tauri/Cargo.toml").text()) as {
    features: Record<string, string[]>;
  };
  expect(cargo.features.default).not.toContain("native-acceptance");
  const main = await Bun.file("../apps/desktop/src-tauri/src/main.rs").text();
  expect(main).toContain('#[cfg(all(feature = "native-acceptance", not(debug_assertions)))]\ncompile_error!');
  expect(main).toContain('#[cfg(all(feature = "native-acceptance", debug_assertions))]\nmod native_acceptance;');
  expect(main.match(/#\[cfg\(all\(feature = "native-acceptance", debug_assertions\)\)\]/g)).toHaveLength(4);
});

test("Desktop records lifecycle and panic metadata without logging the panic payload", async () => {
  const main = await Bun.file("../apps/desktop/src-tauri/src/main.rs").text();
  for (const event of ["start", "ready", "close-requested", "destroyed", "exit-requested", "exit", "panic"]) {
    expect(main).toContain(`"desktop:${event}"`);
  }
  expect(main).toContain('operation_log::record("desktop:panic", &std::process::id().to_string())');
  expect(main).toContain("previous_panic_hook(info)");
});
