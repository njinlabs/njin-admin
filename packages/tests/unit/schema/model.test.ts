import { describe, expect, test } from "bun:test";
import { toFields, toModelSchema } from "../../../src/sdk/schema/model";
import post from "../../fixtures/post-schema.json";

// post-schema.json is the real output of toAdminSchema for a model using every field type.
const fields = toFields(post);
const field = (key: string) => fields.find((f) => f.key === key)!;

describe("toFields", () => {
  test("keeps the order of the server and leaves out nothing it can render", () => {
    expect(fields.map((f) => f.key)).toEqual([
      "title",
      "slug",
      "note",
      "views",
      "email",
      "body",
      "on",
      "when",
      "status",
      "tag",
      "tags",
      "cover",
      "gallery",
      "links",
      "seo",
    ]);
  });

  test("text: label, unique, required", () => {
    expect(field("title")).toMatchObject({
      renderAs: "text",
      label: "Title",
      unique: true,
      required: true,
    });
  });

  test("a field missing from required is optional", () => {
    expect(field("slug").required).toBe(false);
  });

  test("a nullable field is unwrapped from anyOf and not required", () => {
    expect(field("note")).toMatchObject({
      renderAs: "text",
      label: "Note",
      nullable: true,
      required: false,
    });
  });

  test("a field with a default is not required and keeps the default", () => {
    expect(field("views")).toMatchObject({
      renderAs: "numeric",
      default: 0,
      required: false,
    });
  });

  test("email is a text input", () => {
    expect(field("email").renderAs).toBe("text");
  });

  test("select lists its options", () => {
    expect(field("status")).toMatchObject({
      renderAs: "select",
      options: ["a", "b"],
      default: "a",
    });
  });

  test("relation and file point at their model", () => {
    expect(field("tag")).toMatchObject({
      renderAs: "relation",
      model: "tag",
      labelKey: "name",
    });
    expect(field("tags")).toMatchObject({
      renderAs: "multi_relation",
      model: "tag",
    });
    expect(field("cover")).toMatchObject({ renderAs: "file", model: "file" });
    expect(field("gallery")).toMatchObject({
      renderAs: "multi_file",
      model: "file",
    });
  });

  test("array has an element", () => {
    expect(field("links")).toMatchObject({
      renderAs: "array",
      element: { renderAs: "text", label: "Link" },
    });
  });

  test("object has members, and arrays of objects nest", () => {
    const seo = field("seo");
    if (seo.renderAs !== "object") throw new Error("seo should be an object");

    expect(seo.members.map((m) => m.key)).toEqual(["title", "tags"]);

    const tags = seo.members[1]!;
    if (tags.renderAs !== "array" || tags.element.renderAs !== "object") {
      throw new Error("tags should be an array of objects");
    }
    expect(tags.element.members[0]).toMatchObject({
      key: "k",
      renderAs: "text",
      required: true,
    });
  });

  test("an unknown renderAs falls back to its JSON type, or is left out", () => {
    const out = toFields({
      type: "object",
      properties: {
        a: { type: "string", renderAs: "color", label: "A" },
        b: { type: "object", renderAs: "map" },
      },
    });

    expect(out.map((f) => [f.key, f.renderAs])).toEqual([["a", "text"]]);
  });
});

test("toModelSchema swaps schema for fields and keeps the flags", () => {
  const model = toModelSchema({
    name: "Post",
    prefix: "post",
    draftable: true,
    i18n: false,
    schema: post,
  });

  expect(model).toMatchObject({
    name: "Post",
    prefix: "post",
    draftable: true,
    i18n: false,
  });
  expect(model.fields).toHaveLength(15);
  expect("schema" in model).toBe(false);
});
