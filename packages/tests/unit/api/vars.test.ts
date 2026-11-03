import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  draftVars,
  draftVarsMutation,
  getVars,
  updateVars,
  updateVarsMutation,
  varsQuery,
} from "../../../src/sdk/api/vars";
import { capture, runMutation } from "./capture";

type Site = { title: string };

test("getVars reads the working copy by default", async () => {
  const { client, uri } = capture({ data: { title: "a" } });

  const site = await getVars<Site>(client, "site");

  expect(site.title).toBe("a");
  expect(uri()).toBe("/api/vars/site");
});

test("getVars published reads /published", async () => {
  const { client, uri } = capture({ data: { title: "a" } });

  await getVars<Site>(client, "site", { published: true, locale: "en" });

  expect(uri()).toBe("/api/vars/site/published?locale=en");
});

test("updateVars puts the fields", async () => {
  const { client, sent } = capture({ data: { title: "b" } });

  await updateVars<Site>(client, "site", { title: "b" });

  expect(sent[0]).toMatchObject({ method: "put", url: "/api/vars/site" });
});

test("varsQuery fetches the group and keys it under vars", async () => {
  const { client, uri } = capture({ data: { title: "a" } });
  const options = varsQuery<Site>(client, "site", { locale: "en" });

  expect([...options.queryKey]).toEqual(["vars", "site", { locale: "en" }]);
  expect(await new QueryClient().fetchQuery(options)).toEqual({ title: "a" });
  expect(uri()).toBe("/api/vars/site?locale=en");
});

test("updateVarsMutation puts the fields, then refreshes the group", async () => {
  const queries = new QueryClient();
  const { client, sent } = capture({ data: { title: "b" } });
  const key = [...varsQuery(client, "site").queryKey];
  queries.setQueryData(key, 1);

  const options = updateVarsMutation<Site>(client, queries, "site");
  await runMutation(options, { title: "b" });

  expect(sent[0]).toMatchObject({ method: "put", url: "/api/vars/site" });
  expect(queries.getQueryState(key)?.isInvalidated).toBe(true);
});

test("draftVars posts the action, limited to the languages given", async () => {
  const { client, sent, uri } = capture({ data: { title: "a" } });

  await draftVars<Site>(client, "site", "publish");
  await draftVars<Site>(client, "site", "discard", ["en", "id"]);

  expect(sent[0]).toMatchObject({ method: "post" });
  expect(uri(0)).toBe("/api/vars/site/publish");
  expect(uri(1)).toBe("/api/vars/site/discard?locale=en,id");
});

test("draftVarsMutation refreshes the group", async () => {
  const { client } = capture({ data: { title: "a" } });
  const queryClient = new QueryClient();
  const invalidated: unknown[] = [];
  queryClient.invalidateQueries = (async (filters: unknown) => {
    invalidated.push(filters);
  }) as never;

  await runMutation(draftVarsMutation<Site>(client, queryClient, "site"), {
    action: "unpublish" as const,
  });

  expect(invalidated).toEqual([{ queryKey: ["vars", "site"] }]);
});
