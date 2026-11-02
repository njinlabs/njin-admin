import { describe, expect, test } from "bun:test";
import z from "zod";
import {
  getDefaultValues,
  toForm,
  transformSchema,
} from "../../../src/sdk/schema/schema";
import post from "../../fixtures/post-schema.json";
import rules from "../../fixtures/rules-schema.json";

// The pipeline of the old admin, as app-sidebar.tsx ran it for each model: the server's JSON
// schema becomes the one zod schema, and the form and the defaults are read from that.
// The old file cannot read a nullable field yet, so the one nullable field of the fixture is left out.
const { note: _note, ...properties } = post.properties;
const withoutNullable = {
  ...post,
  properties,
  required: post.required.filter((key) => key !== "note"),
};

const build = (json: object) => {
  const schema = transformSchema(
    z.fromJSONSchema(json as never) as z.ZodObject,
  );
  return { schema, form: toForm(schema) };
};

describe("the zod schema made from the server's JSON schema", () => {
  const { schema, form } = build(withoutNullable);

  test("lists the fields in the order the server sent them", () => {
    expect(form.map((f) => f.key)).toEqual(Object.keys(properties));
  });

  test("carries label, type, unique, options and the related model", () => {
    const by = (key: string) => form.find((f) => f.key === key)!;

    expect(by("title")).toMatchObject({
      type: "text",
      label: "Title",
      unique: true,
    });
    expect(by("status")).toMatchObject({
      type: "select",
      options: { a: "a", b: "b" },
    });
    expect(by("tag")).toMatchObject({
      type: "relation",
      model: "tag",
      labelKey: "name",
    });
    expect(by("cover")).toMatchObject({ type: "file" });
  });

  test("reads the defaults from the schema", () => {
    expect(getDefaultValues(schema)).toEqual({ views: 0, status: "a" });
  });

  test("sends a relation as the id, whether the form holds the record or the id", () => {
    const base = {
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
    };
    const fromRecord = schema.parse({
      ...base,
      tag: { id: "t1", name: "News" },
    });
    const fromId = schema.parse({ ...base, tag: "t1" });

    expect(fromRecord.tag).toBe("t1");
    expect(fromId.tag).toBe("t1");
  });
});

describe("the same schema enforces what the backend enforces", () => {
  const { schema } = build(rules);
  const valid = {
    title: "Hello",
    code: "ABC",
    contact: "a@b.co",
    age: 30,
    score: 5,
    links: ["x"],
    tags: ["t1"],
    kind: "a",
  };
  const fails = (patch: object) =>
    !schema.safeParse({ ...valid, ...patch }).success;

  test("accepts a valid form", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  test("length, pattern, email, ranges and item counts, with no rule written by hand", () => {
    expect(fails({ title: "ab" })).toBe(true);
    expect(fails({ title: "x".repeat(11) })).toBe(true);
    expect(fails({ code: "abc" })).toBe(true);
    expect(fails({ contact: "nope" })).toBe(true);
    expect(fails({ age: 17 })).toBe(true);
    expect(fails({ age: 100 })).toBe(true);
    expect(fails({ score: 0 })).toBe(true);
    expect(fails({ score: 10 })).toBe(true);
    expect(fails({ kind: "zzz" })).toBe(true);
  });
});
