import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Field, Select, Switch } from "../../../src/ui";

const options = [
  { value: "draft", label: "Draft" },
  { value: "live", label: "Published" },
];

describe("Switch", () => {
  test("renders checked and unchecked", () => {
    const on = renderToString(<Switch checked onCheckedChange={() => {}} />);
    const off = renderToString(
      <Switch checked={false} onCheckedChange={() => {}} />,
    );

    expect(on).toContain('aria-checked="true"');
    expect(off).toContain('aria-checked="false"');
  });

  test("is marked invalid inside an invalid field", () => {
    expect(
      renderToString(
        <Field invalid>
          <Switch />
        </Field>,
      ),
    ).toContain("data-invalid");
  });
});

describe("Select", () => {
  test("shows the label of the chosen option, not its value", () => {
    const html = renderToString(
      <Select options={options} value="live" onValueChange={() => {}} />,
    );

    expect(html).toContain("Published");
    expect(html).not.toContain(">live<");
  });

  test("shows the placeholder without a value", () => {
    const html = renderToString(
      <Select
        options={options}
        value={null}
        onValueChange={() => {}}
        placeholder="Pick one"
      />,
    );

    expect(html).toContain("Pick one");
  });
});
