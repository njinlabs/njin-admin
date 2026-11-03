import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  Badge,
  Button,
  ConfirmDialog,
  cn,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Skeleton,
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

  test("can stand on its own, outside a field", () => {
    const html = renderToString(<FieldError>The request failed.</FieldError>);

    expect(html).toContain("The request failed.");
    expect(html).toContain('role="alert"');
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

describe("Skeleton", () => {
  test("is hidden from assistive tech and takes the caller's size", () => {
    const html = renderToString(<Skeleton className="h-4 w-1/2" />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("animate-pulse");
    expect(html).toContain("h-4 w-1/2");
  });
});

describe("ConfirmDialog", () => {
  const dialog = (open: boolean) =>
    renderToString(
      <ConfirmDialog
        open={open}
        onOpenChange={() => {}}
        title="Sign out?"
        confirmLabel="Yes"
        onConfirm={() => {}}
      />,
    );

  test("renders nothing while closed", () => {
    expect(dialog(false)).not.toContain("Sign out?");
  });
});

describe("Button danger-ghost", () => {
  test("is red text without a fill", () => {
    const html = renderToString(<Button variant="danger-ghost">Out</Button>);

    expect(html).toContain("text-danger");
    expect(html).not.toContain("bg-danger ");
  });
});

describe("Badge", () => {
  test("applies the variant and keeps the caller's class last", () => {
    const html = renderToString(
      <Badge variant="primary" className="uppercase">
        Admin
      </Badge>,
    );

    expect(html).toContain("text-primary");
    expect(html).toContain("uppercase");
    expect(html).toContain("Admin");
  });
});
