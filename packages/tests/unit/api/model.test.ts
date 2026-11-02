import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  createRecordMutation,
  destroyRecordMutation,
  draftActionMutation,
  modelApi,
  readRecords,
  recordQuery,
  recordsQuery,
  removeLocaleMutation,
  toParams,
  updateRecordMutation,
} from "../../../src/sdk/api/model";
import { capture, runMutation } from "./capture";

test("lists become comma-joined strings", () => {
  const params = toParams({
    populate: ["author", "tags"],
    select: ["title", "author.name"],
  });

  expect(params.populate).toBe("author,tags");
  expect(params.select).toBe("title,author.name");
});

test("populate none stays as it is", () => {
  expect(toParams({ populate: "none" }).populate).toBe("none");
});

test("fallback becomes the string the server reads", () => {
  expect(toParams({ fallback: false }).fallback).toBe("false");
  expect(toParams({}).fallback).toBeUndefined();
});

test("plain keys pass through", () => {
  expect(toParams({ page: 2, order: "desc" })).toMatchObject({
    page: 2,
    order: "desc",
  });
});

const page = {
  data: [{ id: "1", title: "a" }],
  meta: { total: 1, page: 1, limit: 20, pageCount: 1 },
};

test("reads /api/<prefix> and returns data with meta", async () => {
  const { client, uri } = capture(page);

  const result = await readRecords<{ id: string; title: string }>(
    client,
    "post",
    { page: 2 },
  );

  expect(result.data[0]?.title).toBe("a");
  expect(result.meta.total).toBe(1);
  expect(uri()).toBe("/api/post?page=2");
});

test("filters go out as filters[field] and filters[field][$op]", async () => {
  const { client, uri } = capture(page);

  await readRecords(client, "post", {
    filters: { status: "PUBLISH", price: { $gte: 100 } },
  });

  expect(decodeURIComponent(uri())).toBe(
    "/api/post?filters[status]=PUBLISH&filters[price][$gte]=100",
  );
});

type Post = { id: string; title: string };

test("create posts the input and returns the record", async () => {
  const { client, sent } = capture({ data: { id: "9", title: "hi" } });

  const post = await modelApi<Post, { title: string }>(client, "post").create({
    title: "hi",
  });

  expect(post.id).toBe("9");
  expect(sent[0]).toMatchObject({ method: "post", url: "/api/post" });
  expect(JSON.parse(sent[0]!.data)).toEqual({ title: "hi" });
});

test("update puts to the id", async () => {
  const { client, sent } = capture();

  await modelApi<Post, { title: string }>(client, "post").update("3", {
    title: "x",
  });

  expect(sent[0]).toMatchObject({ method: "put", url: "/api/post/3" });
});

test("destroy deletes the id", async () => {
  const { client, sent } = capture();

  await modelApi(client, "post").destroy("3");

  expect(sent[0]).toMatchObject({ method: "delete", url: "/api/post/3" });
});

test("draft publishes only the given locales", async () => {
  const { client, sent, uri } = capture();

  await modelApi(client, "post").draft("3", "publish", ["en", "id"]);

  expect(sent[0]?.method).toBe("post");
  expect(decodeURIComponent(uri())).toBe("/api/post/3/publish?locale=en,id");
});

test("draft without locales sends no locale", async () => {
  const { client, uri } = capture();

  await modelApi(client, "post").draft("3", "discard");

  expect(uri()).toBe("/api/post/3/discard");
});

test("removeLocale deletes /:id/locale/:locale", async () => {
  const { client, sent } = capture();

  await modelApi(client, "post").removeLocale("3", "id");

  expect(sent[0]).toMatchObject({
    method: "delete",
    url: "/api/post/3/locale/id",
  });
});

describe("query options", () => {
  test("recordsQuery fetches the list and keys it under the model", async () => {
    const page = {
      data: [],
      meta: { total: 0, page: 1, limit: 20, pageCount: 0 },
    };
    const { client, uri } = capture(page);
    const options = recordsQuery(client, "post", { page: 2 });

    expect([...options.queryKey]).toEqual([
      "model",
      "post",
      "list",
      { page: 2 },
    ]);
    expect(await new QueryClient().fetchQuery(options)).toEqual(page);
    expect(uri()).toBe("/api/post?page=2");
  });

  test("recordQuery fetches one record", async () => {
    const { client, uri } = capture({ data: { id: "3" } });
    const options = recordQuery(client, "post", "3");

    expect([...options.queryKey]).toEqual([
      "model",
      "post",
      "show",
      "3",
      undefined,
    ]);
    expect(await new QueryClient().fetchQuery(options)).toEqual({ id: "3" });
    expect(uri()).toBe("/api/post/3");
  });

  test("one invalidate on the model prefix covers lists and records", () => {
    const queries = new QueryClient();
    const { client } = capture();
    const list = [...recordsQuery(client, "post").queryKey];
    const one = [...recordQuery(client, "post", "3").queryKey];
    const other = [...recordsQuery(client, "tag").queryKey];
    for (const key of [list, one, other]) queries.setQueryData(key, 1);

    queries.invalidateQueries({ queryKey: ["model", "post"] });

    expect(queries.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queries.getQueryState(one)?.isInvalidated).toBe(true);
    expect(queries.getQueryState(other)?.isInvalidated).toBe(false);
  });
});

describe("mutation options", () => {
  const stale = (queries: QueryClient, key: readonly unknown[]) =>
    queries.getQueryState([...key])?.isInvalidated;

  test("create sends the input, then refreshes the model's queries", async () => {
    const queries = new QueryClient();
    const { client, sent } = capture({ data: { id: "9" } });
    const list = [...recordsQuery(client, "post").queryKey];
    const other = [...recordsQuery(client, "tag").queryKey];
    queries.setQueryData(list, 1);
    queries.setQueryData(other, 1);

    const options = createRecordMutation(client, queries, "post");
    await runMutation(options, { title: "hi" });

    expect(sent[0]).toMatchObject({ method: "post", url: "/api/post" });
    expect(stale(queries, list)).toBe(true);
    expect(stale(queries, other)).toBe(false);
  });

  test("update takes the id and the input together", async () => {
    const { client, sent } = capture();
    const options = updateRecordMutation(client, new QueryClient(), "post");

    await runMutation(options, { id: "3", input: { title: "x" } });

    expect(sent[0]).toMatchObject({ method: "put", url: "/api/post/3" });
  });

  test("destroy takes the id", async () => {
    const { client, sent } = capture();
    const options = destroyRecordMutation(client, new QueryClient(), "post");

    await runMutation(options, "3");

    expect(sent[0]).toMatchObject({ method: "delete", url: "/api/post/3" });
  });

  test("draft takes the action and the locales", async () => {
    const { client, sent, uri } = capture();
    const options = draftActionMutation(client, new QueryClient(), "post");

    await runMutation(options, {
      id: "3",
      action: "unpublish",
      locales: ["en"],
    });

    expect(sent[0]?.method).toBe("post");
    expect(uri()).toBe("/api/post/3/unpublish?locale=en");
  });

  test("removing a language is a mutation too", async () => {
    const { client, sent } = capture();
    const options = removeLocaleMutation(client, new QueryClient(), "post");

    await runMutation(options, { id: "3", locale: "id" });

    expect(sent[0]).toMatchObject({
      method: "delete",
      url: "/api/post/3/locale/id",
    });
  });
});
