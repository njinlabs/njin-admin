import { describe, expect, test } from "bun:test";
import z from "zod";
import {
  getDefaultValues,
  localizedDefault,
  toForm,
  toInput,
  transformSchema,
} from "../../../src/sdk/schema/schema";
import article from "../../fixtures/article-schema.json";
import post from "../../fixtures/post-schema.json";
import rules from "../../fixtures/rules-schema.json";

// The pipeline of the old admin, as app-sidebar.tsx ran it for each model: the server's JSON
// schema becomes the one zod schema, and the form and the defaults are read from that.
const build = (json: object) => {
  const schema = transformSchema(
    z.fromJSONSchema(json as never) as z.ZodObject,
  );
  return { schema, form: toForm(schema) };
};

describe("the zod schema made from the server's JSON schema", () => {
  const { schema, form } = build(post);

  test("lists the fields in the order the server sent them", () => {
    expect(form.map((f) => f.key)).toEqual(Object.keys(post.properties));
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
      note: null,
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

describe("a nullable field", () => {
  const { schema, form } = build(post);
  const note = form.find((f) => f.key === "note");

  test("is read for its label and type, not lost as a union with no meta", () => {
    expect(note).toMatchObject({ type: "text", label: "Note" });
  });

  test("still takes null, and still refuses the wrong type", () => {
    const only = z.object({ note: schema.shape.note });

    expect(only.safeParse({ note: null }).success).toBe(true);
    expect(only.safeParse({ note: "text" }).success).toBe(true);
    expect(only.safeParse({ note: 5 }).success).toBe(false);
  });

  test("works for a link, an object and a list too", () => {
    const nullable = (node: object) => ({
      type: "object",
      properties: { f: { anyOf: [node, { type: "null" }] } },
      required: ["f"],
    });
    const nodes = {
      relation: {
        label: "R",
        renderAs: "relation",
        model: "tag",
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      object: {
        label: "O",
        renderAs: "object",
        type: "object",
        properties: { a: { label: "A", renderAs: "text", type: "string" } },
        required: ["a"],
      },
      array: {
        label: "L",
        renderAs: "array",
        type: "array",
        items: { label: "I", renderAs: "text", type: "string" },
      },
    };

    for (const [renderAs, node] of Object.entries(nodes)) {
      const built = build(nullable(node));

      expect(built.form[0]).toMatchObject({ key: "f", type: renderAs });
      expect(built.schema.safeParse({ f: null }).success).toBe(true);
    }
  });
});

describe("the number of items in a list", () => {
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

  test("is enforced on a list, as the server enforces it", () => {
    expect(fails({ links: [] })).toBe(true);
    expect(fails({ links: ["a", "b", "c", "d"] })).toBe(true);
    expect(schema.safeParse({ ...valid, links: ["a", "b", "c"] }).success).toBe(
      true,
    );
  });

  test("is enforced on a list of links too", () => {
    expect(fails({ tags: [] })).toBe(true);
    expect(
      schema.safeParse({ ...valid, tags: [{ id: "a" }, "b"] }).success,
    ).toBe(true);
  });

  test("is enforced on a list inside an object", () => {
    const nested = build({
      type: "object",
      properties: {
        seo: {
          label: "SEO",
          renderAs: "object",
          type: "object",
          properties: {
            tags: {
              label: "T",
              renderAs: "array",
              type: "array",
              minItems: 1,
              items: { label: "I", renderAs: "text", type: "string" },
            },
          },
          required: ["tags"],
        },
      },
      required: ["seo"],
    });

    expect(nested.schema.safeParse({ seo: { tags: [] } }).success).toBe(false);
    expect(nested.schema.safeParse({ seo: { tags: ["a"] } }).success).toBe(
      true,
    );
  });
});

describe("the id of a link", () => {
  const { schema } = build({
    type: "object",
    properties: {
      tag: {
        label: "Tag",
        renderAs: "relation",
        model: "tag",
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      tags: {
        label: "Tags",
        renderAs: "multi_relation",
        model: "tag",
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["tag", "tags"],
  });

  test("is kept exactly as the server sent it, a colon included", () => {
    const parsed = schema.parse({
      tag: { id: "0192:a-b:c" },
      tags: ["x:1", { id: "y:2" }],
    });

    expect(parsed.tag).toBe("0192:a-b:c");
    expect(parsed.tags).toEqual(["x:1", "y:2"]);
  });

  test("is a string even when the record holds it as a number", () => {
    expect(schema.parse({ tag: { id: 7 }, tags: [] }).tag).toBe("7");
  });
});

describe("a model with i18n", () => {
  const { schema, form } = build(article);
  const by = (key: string) => form.find((f) => f.key === key)!;

  test("reads a field with a value per language as the field of one language", () => {
    expect(by("title")).toMatchObject({
      type: "text",
      label: "Title",
      localized: true,
    });
    expect(by("slug")).toMatchObject({ type: "text", unique: true });
    expect(by("faq")).toMatchObject({
      type: "array",
      localized: true,
      element: { type: "object" },
    });
    expect(by("isFeatured").localized).toBeUndefined();
  });

  test("reduces a file picked in a language to its id", () => {
    const ok = {
      title: { id: "Halo" },
      slug: { id: "halo" },
      body: {},
      faq: {},
      isFeatured: false,
    };
    const parsed = schema.safeParse({
      ...ok,
      cover: { id: { id: "f1", name: "a.png" }, en: "f2" },
    });

    expect(by("cover")).toMatchObject({ type: "file", localized: true });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.cover).toEqual({ id: "f1", en: "f2" });
  });

  test("validates each language the form sends", () => {
    const ok = {
      title: { id: "Halo", en: "Hello" },
      slug: { id: "halo" },
      body: {},
      faq: { id: [{ question: "Q", answer: "A" }] },
      isFeatured: false,
    };

    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, title: { id: "Hi" } }).success).toBe(
      false,
    );
  });
});

describe("localizedDefault", () => {
  const language = (extra: object) => ({
    type: "object",
    propertyNames: { type: "string" },
    additionalProperties: {
      renderAs: "text",
      type: "string",
      label: "T",
      localized: true,
      ...extra,
    },
    label: "T",
    localized: true,
  });
  const { schema } = build({
    type: "object",
    properties: {
      tagline: language({ default: "Welcome" }),
      motto: language({}),
      phone: { renderAs: "text", type: "string", label: "Phone", default: "1" },
    },
    required: [],
  });

  test("is what a language holds when nothing was written in it", () => {
    expect(localizedDefault(schema, "tagline")).toBe("Welcome");
  });

  test("is nothing for a field without a default, or one that is not per language", () => {
    expect(localizedDefault(schema, "motto")).toBeUndefined();
    expect(localizedDefault(schema, "phone")).toBeUndefined();
    expect(localizedDefault(schema, "missing")).toBeUndefined();
  });
});

describe("a field tagged by a plugin", () => {
  // `plugin(text(), ["reports:slugify", { from: "title" }])` on the server only adds this to the
  // field's JSON schema; the type underneath is the text's own.
  const tagged = {
    type: "object",
    properties: {
      slug: {
        type: "string",
        label: "Slug",
        renderAs: "text",
        plugin: ["reports:slugify", { from: "title" }],
      },
      title: { type: "string", label: "Title", renderAs: "text" },
    },
    required: ["slug", "title"],
  };

  test("is read as the name and the options, with the base type kept", () => {
    const { form } = build(tagged);

    expect(form[0]).toMatchObject({
      key: "slug",
      type: "text",
      plugin: { name: "reports:slugify", options: { from: "title" } },
    });
    expect(form[1]?.plugin).toBeUndefined();
  });

  test("validates as the base type does", () => {
    const { schema } = build(tagged);

    expect(schema.safeParse({ slug: "a", title: "b" }).success).toBe(true);
    expect(schema.safeParse({ slug: 1, title: "b" }).success).toBe(false);
  });
});

describe("what the form knows about a field being required", () => {
  const json = {
    type: "object",
    properties: {
      title: { label: "Title", renderAs: "text", type: "string" },
      slug: { label: "Slug", renderAs: "text", type: "string" },
      note: {
        anyOf: [
          { label: "Note", renderAs: "text", type: "string" },
          { type: "null" },
        ],
      },
      views: {
        default: 0,
        type: "number",
        label: "Views",
        renderAs: "numeric",
      },
      cover: {
        label: "Cover",
        renderAs: "file",
        model: "file",
        type: "string",
      },
      links: {
        label: "Links",
        renderAs: "array",
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: { label: "Link", renderAs: "text", type: "string" },
      },
    },
    required: ["title", "note", "views", "links"],
  };
  const { schema, form } = build(json);
  const by = (key: string) => form.find((f) => f.key === key)!;

  test("marks only what the server needs filled in", () => {
    expect(by("title").required).toBe(true);
    expect(by("slug").required).toBe(false); // optional
    expect(by("note").required).toBe(false); // may be null
    expect(by("views").required).toBe(false); // has a default
    expect(by("cover").required).toBe(false);
  });

  test("reads the nullable flag and the length limits of an array", () => {
    expect(by("note").nullable).toBe(true);
    expect(by("slug").nullable).toBe(false);
    expect(by("links")).toMatchObject({ minItems: 1, maxItems: 3 });
  });

  test("a required text is not satisfied by an empty one", () => {
    const ok = { title: "A", note: null, links: ["x"] };

    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, title: "" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, slug: "" }).success).toBe(true);
  });

  test("a cleared optional link is null, and a required one cannot be", () => {
    const ok = { title: "A", note: null, links: ["x"] };

    expect(schema.safeParse({ ...ok, cover: null }).success).toBe(true);
    expect(schema.safeParse({ ...ok, cover: { id: "f1" } }).data?.cover).toBe(
      "f1",
    );
    expect(
      build({
        ...json,
        required: [...json.required, "cover"],
      }).schema.safeParse({
        ...ok,
        cover: null,
      }).success,
    ).toBe(false);
  });

  test("the array keeps refusing too many or too few elements", () => {
    expect(
      schema.safeParse({ title: "A", note: null, links: [] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ title: "A", note: null, links: ["a", "b", "c", "d"] })
        .success,
    ).toBe(false);
  });

  test("toInput leaves out an empty text, or sends null where the field may be", () => {
    const sent = toInput(form, {
      title: "A",
      slug: "",
      note: "",
      views: 2,
      links: ["", "x"],
    });

    expect(sent).toEqual({
      title: "A",
      note: null,
      views: 2,
      links: ["", "x"],
    });
  });

  test("toInput cleans inside objects and the objects of an array", () => {
    const nested = build({
      type: "object",
      properties: {
        seo: {
          type: "object",
          label: "SEO",
          renderAs: "object",
          properties: { t: { label: "T", renderAs: "text", type: "string" } },
        },
        rows: {
          type: "array",
          label: "Rows",
          renderAs: "array",
          items: {
            type: "object",
            label: "Row",
            renderAs: "object",
            properties: { k: { label: "K", renderAs: "text", type: "string" } },
          },
        },
      },
    });

    expect(
      toInput(nested.form, { seo: { t: "" }, rows: [{ k: "" }, { k: "a" }] }),
    ).toEqual({ seo: {}, rows: [{}, { k: "a" }] });
  });
});
