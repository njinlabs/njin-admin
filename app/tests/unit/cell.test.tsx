import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { isListable, renderCell } from "../../src/lib/cell";

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
    ).toBe("ada");
    // No label key: the first text field that is not the id.
    expect(html(renderCell({ type: "relation" }, author))).toBe("Ada");
    // Not expanded: the id is all there is.
    expect(html(renderCell({ type: "relation" }, "a1"))).toBe("a1");
  });

  test("a file shows its name", () => {
    expect(
      html(renderCell({ type: "file" }, { id: "f1", name: "cv.pdf" })),
    ).toBe("cv.pdf");
  });
});
