import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as reactQuery from "@tanstack/react-query";
import * as reactRouter from "@tanstack/react-router";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as ReactDom from "react-dom";
import { renderToString } from "react-dom/server";
import { build } from "vite";
import * as sdk from "../../src/sdk";
import { exposeShared } from "../../src/shared";
import * as ui from "../../src/ui";
import { adminPluginConfig } from "../../src/vite";

const plugin = resolve(import.meta.dirname, "../fixtures/plugin");

let outDir: string;
let built: string;

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), "njin-plugin-"));
  await build({
    root: plugin,
    configFile: false,
    logLevel: "silent",
    ...adminPluginConfig({ entry: "src/index.tsx", outDir }),
  });
  built = join(outDir, "index.js");
});

afterAll(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe("building and loading an admin plugin", () => {
  test("the bundle does not carry React, it reads it from the admin", async () => {
    const code = await Bun.file(built).text();

    expect(code).not.toMatch(/from\s*["']react/);
    expect(code).toContain('globalThis.__njin["react/jsx-runtime"]');
  });

  test("the bundle reads the kit from the admin instead of carrying Base UI", async () => {
    const code = await Bun.file(built).text();

    expect(code).toContain('globalThis.__njin["@njinlabs/njin-admin/ui"]');
    expect(code).not.toContain("base-ui");
  });

  test("the plugin loads and its icon renders with the admin's React", async () => {
    exposeShared({
      react: React,
      "react/jsx-runtime": jsxRuntime,
      "react-dom": ReactDom,
      "@tanstack/react-query": reactQuery,
      "@tanstack/react-router": reactRouter,
      "@njinlabs/njin-admin/sdk": sdk,
      "@njinlabs/njin-admin/ui": ui,
    });

    const { default: plugin } = await import(pathToFileURL(built).href);
    const [nav] = plugin.navs;

    expect(nav.label).toBe("Reports");
    expect(nav.to).toBe("/reports");
    expect(renderToString(React.createElement(nav.icon))).toContain("<svg");
    expect(plugin.name).toBe("reports");
    expect(nav.requires).toEqual({ resource: "report", action: "read" });
    expect(Object.keys(plugin.fields)).toEqual(["slugify"]);
  });

  test("a widget built apart reads the admin's session", async () => {
    const { default: plugin } = await import(pathToFileURL(built).href);
    const [{ component: Total }] = plugin.widgets;
    const session = (permissions: sdk.Permissions) =>
      renderToString(
        React.createElement(
          sdk.SessionContext,
          {
            value: {
              user: { id: "u1" },
              permissions,
              client: sdk.createClient(),
            },
          },
          React.createElement(Total),
        ),
      );

    expect(
      session([
        { resource: "report", scoped: false, actions: { read: "all" } },
      ]),
    ).toContain("allowed");
    expect(session([])).toContain("denied");
  });
});
