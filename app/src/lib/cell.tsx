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
  form: Pick<Form, "type" | "labelKey">,
  value: unknown,
): ReactNode => {
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
      return relationLabel(value, form.labelKey);
    case "file": {
      const name = (value as { name?: unknown }).name;
      return typeof name === "string" && name ? name : <Empty />;
    }
    default:
      return String(value);
  }
};
