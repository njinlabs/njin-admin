import { describe, expect, test } from "bun:test";
import { mayPickFiles, relatedLoader } from "../../src/lib/related";

const none = [] as never;
const refOnly = [
  { resource: "tag", scoped: true, actions: { read: "ref" } },
  { resource: "file", scoped: true, actions: { read: "ref" } },
] as never;

describe("what a form may ask of related records and files", () => {
  test("a model with no read is not asked, and offers nothing", async () => {
    const client = new Proxy(
      {},
      { get: () => () => Promise.reject(new Error("asked")) },
    );

    expect(await relatedLoader(client as never, none)("tag", "")).toEqual([]);
  });

  test("files can be picked with any read, and not without one", () => {
    expect(mayPickFiles(refOnly)).toBe(true);
    expect(mayPickFiles(none)).toBe(false);
  });
});
