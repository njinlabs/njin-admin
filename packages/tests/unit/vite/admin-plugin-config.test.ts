import { describe, expect, test } from "bun:test";
import { sharedModules } from "../../../src/shared";
import { adminPluginConfig } from "../../../src/vite";

describe("adminPluginConfig", () => {
  test("builds one ES module from the given entry", () => {
    const { build } = adminPluginConfig({ entry: "src/index.tsx" });

    expect(build?.lib).toEqual({
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: "index",
      cssFileName: "index",
    });
  });

  test("leaves every shared module out of the bundle", () => {
    const { build } = adminPluginConfig({ entry: "src/index.tsx" });

    expect(build?.rollupOptions?.external).toEqual([...sharedModules]);
  });

  test("outputs to dist unless told otherwise", () => {
    expect(adminPluginConfig({ entry: "a" }).build?.outDir).toBe("dist");
    expect(adminPluginConfig({ entry: "a", outDir: "out" }).build?.outDir).toBe(
      "out",
    );
  });
});
