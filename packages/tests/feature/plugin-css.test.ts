import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";
import { adminPluginConfig } from "../../src/vite";

const root = resolve(import.meta.dirname, "../../..");

let outDir: string;
let pluginCss: string;
let adminCss: string;

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), "njin-css-"));

  await build({
    root: join(root, "packages/tests/fixtures/plugin"),
    configFile: false,
    logLevel: "silent",
    ...adminPluginConfig({ entry: "index.tsx", outDir }),
  });
  pluginCss = await Bun.file(join(outDir, "index.css")).text();

  // The admin's own build, in memory: its stylesheet is the one that supplies the tokens.
  const output = (await build({
    root: join(root, "app"),
    configFile: join(root, "app/vite.config.ts"),
    logLevel: "silent",
    build: { write: false },
  })) as { output: { fileName: string; source?: string | Uint8Array }[] };
  const css = output.output.find((file) => file.fileName.endsWith(".css"));
  adminCss = String(css?.source);
});

afterAll(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe("a plugin's stylesheet", () => {
  test("is built beside the script, with the utilities the plugin uses", () => {
    expect(pluginCss).toContain(".bg-primary");
    expect(pluginCss).toContain(".p-4");
    // Only what is used: no utility the plugin never wrote.
    expect(pluginCss).not.toContain(".bg-primary-foreground");
  });

  test("reads the admin's tokens as variables, with the admin's value as fallback", () => {
    expect(pluginCss).toMatch(
      /\.bg-primary\{background-color:var\(--color-primary,/,
    );
    expect(pluginCss).toMatch(
      /\.rounded-control\{border-radius:var\(--radius-control,/,
    );
  });

  test("does not carry the tokens or the reset, the admin already has them", () => {
    expect(pluginCss).not.toMatch(/--color-primary\s*:/);
    expect(pluginCss).not.toMatch(/--radius-control\s*:/);
    expect(pluginCss).not.toContain("box-sizing");
  });
});

describe("the admin's stylesheet", () => {
  test("always writes the tokens, even those no page of the admin uses", () => {
    expect(adminCss).toMatch(/--color-primary\s*:/);
    expect(adminCss).toMatch(/--radius-control\s*:/);
    // No admin page uses this one, so only theme static can put it there.
    expect(adminCss).toMatch(/--color-danger\s*:/);
  });
});
