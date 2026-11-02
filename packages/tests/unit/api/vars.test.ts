import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { getVars, updateVars, varsQuery } from "../../../src/sdk/api/vars";
import { capture } from "./capture";

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
