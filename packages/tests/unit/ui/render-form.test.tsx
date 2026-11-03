import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { useForm } from "react-hook-form";
import type { Form } from "../../../src/sdk/schema";
import { hasInput, isWideField, RenderForm } from "../../../src/ui";

const Demo = ({ form }: { form: Form[] }) => {
  const { control } = useForm({
    defaultValues: { title: "Hello", price: 12.5, live: true },
  });

  return <RenderForm form={form} control={control} />;
};

describe("RenderForm", () => {
  test("draws an input for each simple field type, with its value", () => {
    const html = renderToString(
      <Demo
        form={[
          { key: "title", label: "Title", type: "text" },
          { key: "price", label: "Price", type: "numeric" },
          { key: "live", label: "Live", type: "boolean" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: { draft: "draft" },
          },
          { key: "on", label: "Date", type: "datepicker" },
        ]}
      />,
    );

    expect(html).toContain('value="Hello"');
    expect(html).toContain('value="12.5"');
    expect(html).toContain('role="switch"');
    for (const label of ["Title", "Price", "Live", "Status", "Date"]) {
      expect(html).toContain(label);
    }
  });

  test("draws the members of an object and the elements of an array", () => {
    const Nested = () => {
      const { control } = useForm({
        defaultValues: { author: { name: "Ann" }, tags: ["a", "b"] },
      });

      return (
        <RenderForm
          control={control}
          form={[
            {
              key: "author",
              label: "Author",
              type: "object",
              members: [{ key: "name", label: "Name", type: "text" }],
            },
            {
              key: "tags",
              label: "Tags",
              type: "array",
              element: { label: "Tag", type: "text" },
            },
          ]}
        />
      );
    };
    const html = renderToString(<Nested />);

    expect(html).toContain('value="Ann"');
    expect(html).toContain('value="a"');
    expect(html).toContain('value="b"');
    expect(html).toContain("Tag 2");
    expect(html).toContain("Add");
  });

  test("hasInput needs an input for everything inside an object or array", () => {
    const text = { key: "a", label: "A", type: "text" as const };
    // A type the admin does not know, as a newer server could send.
    const body = { key: "b", label: "B", type: "map" as never };

    expect(hasInput({ label: "X", type: "object", members: [text] })).toBe(
      true,
    );
    expect(
      hasInput({ label: "X", type: "object", members: [text, body] }),
    ).toBe(false);
    expect(hasInput({ label: "X", type: "array", element: text })).toBe(true);
    expect(hasInput({ label: "X", type: "array", element: body })).toBe(false);
  });

  test("draws the language it is given for a localized field", () => {
    const Localized = ({ locale }: { locale?: string }) => {
      const { control } = useForm({
        defaultValues: { title: { id: "Halo", en: "Hello" } },
      });

      return (
        <RenderForm
          control={control}
          locale={locale}
          form={[
            { key: "title", label: "Title", type: "text", localized: true },
          ]}
        />
      );
    };

    expect(renderToString(<Localized locale="en" />)).toContain(
      'value="Hello"',
    );
    expect(renderToString(<Localized locale="id" />)).toContain('value="Halo"');
    expect(renderToString(<Localized />)).toContain("Needs a language");
  });

  test("draws a relation with the record it links to", () => {
    const Related = () => {
      const { control } = useForm({
        defaultValues: {
          tag: { id: "t1", name: "News" },
          tags: [
            { id: "t1", name: "News" },
            { id: "t2", name: "Sport" },
          ],
        },
      });

      return (
        <QueryClientProvider client={new QueryClient()}>
          <RenderForm
            control={control}
            loadRelated={async () => []}
            form={[
              {
                key: "tag",
                label: "Tag",
                type: "relation",
                model: "tag",
                labelKey: "name",
              },
              {
                key: "tags",
                label: "Tags",
                type: "multi_relation",
                model: "tag",
                labelKey: "name",
              },
            ]}
          />
        </QueryClientProvider>
      );
    };
    const html = renderToString(<Related />);

    expect(html).toContain('value="News"');
    expect(html).toContain("Sport");
  });

  test("draws the files a field holds, and needs a window to choose them", () => {
    const Files = ({ picker }: { picker: boolean }) => {
      const { control } = useForm({
        defaultValues: {
          cover: {
            id: "f1",
            name: "cover.png",
            type: "image/png",
            url: "/c.png",
          },
          gallery: [{ id: "f2", name: "a.pdf", type: "application/pdf" }],
        },
      });

      return (
        <RenderForm
          control={control}
          filePicker={picker ? () => null : undefined}
          form={[
            { key: "cover", label: "Cover", type: "file" },
            { key: "gallery", label: "Gallery", type: "multi_file" },
          ]}
        />
      );
    };
    const html = renderToString(<Files picker />);

    expect(html).toContain("cover.png");
    expect(html).toContain('src="/c.png"');
    expect(html).toContain("a.pdf");
    expect(html).toContain("Change files");
    expect(renderToString(<Files picker={false} />)).toContain(
      "Needs a window",
    );
  });

  test("says a relation needs a source of records when none is given", () => {
    const html = renderToString(
      <Demo
        form={[
          {
            key: "tag",
            label: "Tag",
            type: "relation",
            model: "tag",
          },
        ]}
      />,
    );

    expect(html).toContain("Needs a source");
  });

  test("the editor, lists and boxes of fields take the whole width", () => {
    for (const type of [
      "richtext",
      "object",
      "array",
      "multi_relation",
    ] as const) {
      expect(isWideField({ type })).toBe(true);
    }
    for (const type of ["text", "numeric", "boolean", "select"] as const) {
      expect(isWideField({ type })).toBe(false);
    }
  });

  test("has an input for a text with formatting", () => {
    expect(hasInput({ label: "Body", type: "richtext" })).toBe(true);
  });

  test("says so for a type without an input yet", () => {
    const html = renderToString(
      <Demo form={[{ key: "body", label: "Body", type: "map" as never }]} />,
    );

    expect(html).toContain("No input for");
  });
});
