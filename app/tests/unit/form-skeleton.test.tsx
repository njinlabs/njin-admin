import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { FormSkeleton } from "../../src/components/form-skeleton";

describe("FormSkeleton", () => {
  test("has a place for each field, the wide ones across both columns", () => {
    const html = renderToString(
      <FormSkeleton
        form={[{ type: "text" }, { type: "richtext" }, { type: "boolean" }]}
      />,
    );

    expect(html.match(/min-w-0/g)).toHaveLength(3);
    expect(html.match(/@xl:col-span-2/g)).toHaveLength(1);
    expect(html).toContain("h-56");
  });

  test("shows a few of the usual fields while the model is not known", () => {
    expect(renderToString(<FormSkeleton />).match(/min-w-0/g)).toHaveLength(5);
  });

  test("a bar of languages is there only for a model that has them", () => {
    expect(renderToString(<FormSkeleton tabs />)).toContain("data-bleed");
    expect(renderToString(<FormSkeleton />)).not.toContain("data-bleed");
  });
});
