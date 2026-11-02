import { expect, test } from "bun:test";
import type { Schema } from "@njinlabs/njin-admin/sdk";
import { schemaNavs } from "../../src/lib/registry";

const item = (name: string, prefix: string) =>
  ({ name, prefix }) as Schema["models"][number];

test("models and settings groups become menu entries under their own paths", () => {
  const { models, vars } = schemaNavs({
    models: [item("Posts", "post"), item("Pages", "page")],
    vars: [item("General", "general")],
  });

  expect(models.map(({ label, to }) => [label, to])).toEqual([
    ["Posts", "/content/post"],
    ["Pages", "/content/page"],
  ]);
  expect(vars.map(({ label, to }) => [label, to])).toEqual([
    ["General", "/settings/general"],
  ]);
});

test("an empty schema gives an empty menu", () => {
  expect(schemaNavs({ models: [], vars: [] })).toEqual({
    models: [],
    vars: [],
  });
});
