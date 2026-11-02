import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { getSchema, schemaQuery } from "../../../src/sdk/schema";
import post from "../../fixtures/post-schema.json";
import { capture } from "../api/capture";

// post-schema.json has one nullable field, which the old file cannot read yet.
const { note: _note, ...properties } = post.properties;
const entry = {
  name: "Post",
  prefix: "post",
  draftable: false,
  i18n: true,
  schema: {
    ...post,
    properties,
    required: post.required.filter((key) => key !== "note"),
  },
};

test("getSchema reads /api/schema and makes a zod schema and a form for each entry", async () => {
  const { client, uri } = capture({
    models: [entry],
    vars: [{ ...entry, name: "Site", prefix: "site" }],
    i18n: { locales: ["en", "id"], defaultLocale: "en" },
  });

  const schema = await getSchema(client);

  expect(uri()).toBe("/api/schema");
  expect(schema.models[0]?.form[0]).toMatchObject({
    key: "title",
    type: "text",
  });
  expect(schema.models[0]?.schema.shape.title).toBeDefined();
  expect(schema.vars[0]).toMatchObject({ prefix: "site", i18n: true });
  expect(schema.i18n).toEqual({ locales: ["en", "id"], defaultLocale: "en" });
});

test("the schema it returns is the one that reduces a relation to its id", async () => {
  const { client } = capture({ models: [entry], vars: [], i18n: null });
  const [model] = (await getSchema(client)).models;

  const parsed = model!.schema.parse({
    title: "T",
    email: "a@b.co",
    body: "b",
    on: true,
    when: "2026-01-01T00:00:00.000Z",
    status: "a",
    views: 1,
    cover: "f1",
    gallery: [],
    tags: [],
    links: [],
    seo: { title: "x", tags: [] },
    tag: { id: "t1", name: "News" },
  });

  expect(parsed.tag).toBe("t1");
});

test("i18n stays null when the site has no languages", async () => {
  const { client } = capture({ models: [], vars: [], i18n: null });

  expect((await getSchema(client)).i18n).toBeNull();
});

test("schemaQuery fetches the schema under one key", async () => {
  const { client } = capture({ models: [entry], vars: [], i18n: null });
  const options = schemaQuery(client);

  expect([...options.queryKey]).toEqual(["schema"]);
  expect((await new QueryClient().fetchQuery(options)).models[0]?.prefix).toBe(
    "post",
  );
});
