import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  Button,
  cn,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "../../../src/ui";

describe("cn", () => {
  test("lets the later class win over a conflicting earlier one", () => {
    expect(cn("px-4", false, "px-2")).toBe("px-2");
  });
});

describe("Button", () => {
  test("does not submit a form unless asked to", () => {
    expect(renderToString(<Button>Save</Button>)).toContain('type="button"');
    expect(renderToString(<Button type="submit">Save</Button>)).toContain(
      'type="submit"',
    );
  });

  test("applies the variant and keeps the caller's class last", () => {
    const html = renderToString(
      <Button variant="danger" className="w-full">
        Delete
      </Button>,
    );

    expect(html).toContain("bg-danger");
    expect(html).toContain("w-full");
  });
});

describe("FieldError", () => {
  const render = (errors: { message?: string }[]) =>
    renderToString(
      <Field invalid>
        <FieldLabel>Title</FieldLabel>
        <Input />
        <FieldError errors={errors} />
      </Field>,
    );

  test("shows the message of the form library's error", () => {
    expect(render([{ message: "Required" }])).toContain("Required");
  });

  test("shows one message when several errors say the same", () => {
    const html = render([{ message: "Required" }, { message: "Required" }]);

    expect(html.match(/Required/g)).toHaveLength(1);
  });

  test("renders nothing without a message", () => {
    expect(render([{}])).not.toContain("text-danger");
  });
});

describe("Input", () => {
  test("is marked invalid inside an invalid field", () => {
    const html = renderToString(
      <Field invalid>
        <Input />
      </Field>,
    );

    expect(html).toContain("data-invalid");
  });
});
