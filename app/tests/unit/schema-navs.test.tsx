import { expect, test } from "bun:test";
import type { Permissions, Schema } from "@njinlabs/njin-admin/sdk";
import { mainNavs, schemaNavs } from "../../src/lib/registry";

const item = (name: string, prefix: string) =>
  ({ name, prefix }) as Schema["models"][number];

const everything: Permissions = [
  { resource: "post", scoped: true, actions: { read: "all" } },
  { resource: "page", scoped: true, actions: { read: "own" } },
  { resource: "vars.general", scoped: false, actions: { read: "all" } },
  { resource: "file", scoped: true, actions: { read: "all" } },
  { resource: "user", scoped: true, actions: { read: "all" } },
];

test("models and settings groups become menu entries under their own paths", () => {
  const { models, vars } = schemaNavs(
    {
      models: [item("Posts", "post"), item("Pages", "page")],
      vars: [item("General", "general")],
    },
    everything,
  );

  expect(models.map(({ label, to }) => [label, to])).toEqual([
    ["Posts", "/content/post"],
    ["Pages", "/content/page"],
  ]);
  expect(vars.map(({ label, to }) => [label, to])).toEqual([
    ["General", "/settings/general"],
  ]);
});

test("an empty schema gives an empty menu", () => {
  expect(schemaNavs({ models: [], vars: [] }, everything)).toEqual({
    models: [],
    vars: [],
  });
});

test("the menu leaves out what the user cannot browse", () => {
  const permissions: Permissions = [
    { resource: "post", scoped: true, actions: { read: "all" } },
    // Only a dropdown of authors, and only a write to pages: neither is a list to open.
    { resource: "author", scoped: true, actions: { read: "ref" } },
    { resource: "page", scoped: true, actions: { create: "all" } },
    { resource: "vars.seo", scoped: false, actions: { write: "all" } },
  ];
  const { models, vars } = schemaNavs(
    {
      models: [
        item("Posts", "post"),
        item("Authors", "author"),
        item("Pages", "page"),
      ],
      vars: [item("General", "general"), item("SEO", "seo")],
    },
    permissions,
  );

  expect(models.map(({ label }) => label)).toEqual(["Posts"]);
  expect(vars).toEqual([]);
});

test("Files and Users need their own read access, the dashboard does not", () => {
  const labels = (permissions: Permissions) =>
    mainNavs(permissions).map(({ label }) => label);

  expect(labels(everything)).toEqual(["Dashboard", "Files", "Users"]);
  expect(labels([])).toEqual(["Dashboard"]);
  expect(
    labels([{ resource: "file", scoped: true, actions: { read: "own" } }]),
  ).toEqual(["Dashboard", "Files"]);
});
