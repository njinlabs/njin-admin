import type { Form } from "@njinlabs/njin-admin/sdk";
import { formatDate } from "@njinlabs/njin-admin/ui";
import type { ReactNode } from "react";
import { PiCheck, PiX } from "react-icons/pi";

// The field types a list can show in one cell. The rest (richtext, object, array and the multi_*
// types) belong on the form.
const listable: Form["type"][] = [
  "text",
  "email",
  "numeric",
  "datepicker",
  "select",
  "boolean",
  "relation",
  "file",
];

export const isListable = ({ type }: Pick<Form, "type">) =>
  listable.includes(type);

// How wide a column is drawn, by what it holds: a flag needs little, a text more. The list keeps
// every row to one line, so these are widths to cut at ("…"), not to wrap at.
export const columnSize = ({ type }: Pick<Form, "type">) =>
  (
    ({
      boolean: 88,
      numeric: 112,
      datepicker: 120,
      select: 144,
      relation: 168,
      file: 200,
    }) as Partial<Record<Form["type"], number>>
  )[type] ?? 240;

// One line, cut with "…" where it is too long; the whole text is the tooltip.
const Line = ({ children }: { children: string }) => (
  <span className="block truncate" title={children}>
    {children}
  </span>
);

const Empty = () => <span className="text-muted-foreground">-</span>;

// A relation comes expanded one level, so its label is a field of the related record.
const relationLabel = (value: unknown, labelKey?: string) => {
  if (typeof value !== "object" || value === null) return String(value);

  const record = value as Record<string, unknown>;
  const label =
    labelKey !== undefined
      ? record[labelKey]
      : Object.entries(record).find(
          ([key, entry]) => key !== "id" && typeof entry === "string",
        )?.[1];

  return label === undefined || label === null
    ? String(record.id ?? "")
    : String(label);
};

// What a list cell shows for the value of `form`.
export const renderCell = (
  form: Pick<Form, "type" | "labelKey" | "localized">,
  value: unknown,
): ReactNode => {
  // A list comes with every language of a localized field; the cell shows the first it has.
  if (form.localized && typeof value === "object" && value !== null) {
    return renderCell(
      { ...form, localized: false },
      Object.values(value).find((entry) => entry !== null && entry !== ""),
    );
  }

  if (value === undefined || value === null || value === "") return <Empty />;

  switch (form.type) {
    case "boolean":
      return value ? (
        <PiCheck aria-label="Yes" className="size-4 text-primary" />
      ) : (
        <PiX aria-label="No" className="size-4 text-danger" />
      );
    case "datepicker": {
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? String(value) : formatDate(date);
    }
    case "numeric":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "relation":
      return <Line>{relationLabel(value, form.labelKey)}</Line>;
    case "file": {
      const { name, type, url } = value as {
        name?: unknown;
        type?: unknown;
        url?: unknown;
      };
      if (typeof name !== "string" || !name) return <Empty />;

      return (
        <span className="flex items-center gap-2" title={name}>
          {typeof type === "string" &&
          type.startsWith("image/") &&
          typeof url === "string" ? (
            <img
              src={url}
              alt=""
              className="size-6 shrink-0 rounded-control object-cover"
            />
          ) : null}
          <span className="truncate">{name}</span>
        </span>
      );
    }
    default:
      return <Line>{String(value)}</Line>;
  }
};
