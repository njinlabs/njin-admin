import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { getSchema, schemaQuery } from "../../../src/sdk/schema";
import post from "../../fixtures/post-schema.json";
import { capture } from "../api/capture";

const entry = {
  name: "Post",
  prefix: "post",
  draftable: false,
  i18n: true,
  schema: post,
};

test("getSchema reads /api/schema and parses models and vars", async () => {
  const { client, uri } = capture({
    models: [entry],
    vars: [{ ...entry, name: "Site", prefix: "site" }],
    i18n: { locales: ["en", "id"], defaultLocale: "en" },
  });

  const schema = await getSchema(client);

  expect(uri()).toBe("/api/schema");
  expect(schema.models[0]?.fields[0]?.key).toBe("title");
  expect(schema.vars[0]).toMatchObject({ prefix: "site", i18n: true });
  expect(schema.i18n).toEqual({ locales: ["en", "id"], defaultLocale: "en" });
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
