import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { columnSize, isListable, renderCell } from "../../src/lib/cell";

const html = (node: ReturnType<typeof renderCell>) =>
  renderToString(<>{node}</>);

describe("isListable", () => {
  test("keeps the scalar types and leaves the nested and rich ones to the form", () => {
    expect(isListable({ type: "text" })).toBe(true);
    expect(isListable({ type: "relation" })).toBe(true);
    expect(isListable({ type: "richtext" })).toBe(false);
    expect(isListable({ type: "array" })).toBe(false);
    expect(isListable({ type: "multi_file" })).toBe(false);
  });
});

describe("renderCell", () => {
  test("shows a dash for a missing value", () => {
    for (const value of [undefined, null, ""]) {
      expect(html(renderCell({ type: "text" }, value))).toContain("-");
    }
  });

  test("a boolean is a yes or a no, not the word true", () => {
    expect(html(renderCell({ type: "boolean" }, true))).toContain("Yes");
    expect(html(renderCell({ type: "boolean" }, false))).toContain("No");
  });

  test("a date reads day first, and an unreadable one is shown as it came", () => {
    expect(
      html(renderCell({ type: "datepicker" }, "2026-03-09T10:00:00Z")),
    ).toBe("09/03/2026");
    expect(html(renderCell({ type: "datepicker" }, "soon"))).toBe("soon");
  });

  test("a relation shows the label key of the expanded record", () => {
    const author = { id: "a1", name: "Ada", slug: "ada" };

    expect(
      html(renderCell({ type: "relation", labelKey: "slug" }, author)),
    ).toContain(">ada<");
    // No label key: the first text field that is not the id.
    expect(html(renderCell({ type: "relation" }, author))).toContain(">Ada<");
    // Not expanded: the id is all there is.
    expect(html(renderCell({ type: "relation" }, "a1"))).toContain(">a1<");
  });

  test("a file shows its name", () => {
    expect(
      html(renderCell({ type: "file" }, { id: "f1", name: "cv.pdf" })),
    ).toContain(">cv.pdf<");
  });

  test("a file that is an image shows a thumbnail beside its name", () => {
    const file = { id: "f1", name: "a.png", type: "image/png", url: "/a.png" };
    const withThumb = html(renderCell({ type: "file" }, file));

    expect(withThumb).toContain('src="/a.png"');
    expect(withThumb).toContain(">a.png<");
    expect(
      html(renderCell({ type: "file" }, { ...file, type: "application/pdf" })),
    ).not.toContain("<img");
  });

  test("a text is one line, cut where it is long, with the whole of it as the tooltip", () => {
    const text = html(renderCell({ type: "text" }, "A very long title"));

    expect(text).toContain("truncate");
    expect(text).toContain('title="A very long title"');
  });

  test("a localized field read in one language is its text; read in all, the first it has", () => {
    const form = { type: "text" as const, localized: true };

    expect(html(renderCell(form, "Halo"))).toContain(">Halo<");
    expect(html(renderCell(form, { id: "", en: "Hello" }))).toContain(
      ">Hello<",
    );
  });
});

describe("columnSize", () => {
  test("gives a flag little room and a text the most", () => {
    expect(columnSize({ type: "boolean" })).toBeLessThan(
      columnSize({ type: "numeric" }),
    );
    expect(columnSize({ type: "numeric" })).toBeLessThan(
      columnSize({ type: "text" }),
    );
    expect(columnSize({ type: "email" })).toBe(columnSize({ type: "text" }));
  });
});
