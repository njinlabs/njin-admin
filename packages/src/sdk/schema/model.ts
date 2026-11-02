// The JSON schema node the server sends for a field (what zod's toJSONSchema makes, plus the
// meta set by text(), numeric(), relation() ... in njin).
export type SchemaNode = {
  type?: string;
  label?: string;
  renderAs?: string;
  unique?: boolean;
  default?: unknown;
  enum?: string[];
  model?: string;
  labelKey?: string;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
  // A nullable field is anyOf [the field, { type: "null" }].
  anyOf?: SchemaNode[];
};

// What every field has. For an array element it is the same without key and required.
type Base = {
  label: string;
  nullable: boolean;
  unique: boolean;
  default?: unknown;
};

export type Item = Base &
  (
    | {
        renderAs: "text" | "richtext" | "numeric" | "boolean" | "datepicker";
      }
    | { renderAs: "select"; options: string[] }
    | {
        renderAs: "relation" | "multi_relation" | "file" | "multi_file";
        // The prefix of the related model ("file" for files).
        model: string;
        // The related field shown to pick a record by.
        labelKey?: string;
      }
    | { renderAs: "object"; members: Field[] }
    | { renderAs: "array"; element: Item }
  );

export type Field = Item & {
  key: string;
  // Must be filled in: in the schema's required list, with no default, and not nullable.
  required: boolean;
};

// One entry of GET /api/schema "data", before its schema is turned into fields.
export type RawSchema = {
  name: string;
  prefix: string;
  draftable: boolean;
  i18n: boolean;
  schema: SchemaNode;
};

export type ModelSchema = {
  name: string;
  prefix: string;
  draftable: boolean;
  i18n: boolean;
  fields: Field[];
};

const scalars = {
  string: "text",
  number: "numeric",
  integer: "numeric",
  boolean: "boolean",
} as const;

// A nullable field wraps the real one: anyOf [field, { type: "null" }].
const unwrapNullable = (node: SchemaNode) => {
  const branch = node.anyOf?.find((item) => item.type !== "null");
  const nullable = !!node.anyOf?.some((item) => item.type === "null");

  return { node: branch ?? node, nullable };
};

// One schema node as a form item. A renderAs this admin does not know falls back to the
// plain input for its JSON type; with no such input, undefined (the field is left out).
const toItem = (raw: SchemaNode): Item | undefined => {
  const { node, nullable } = unwrapNullable(raw);
  const base = {
    label: node.label ?? "",
    nullable,
    unique: node.unique ?? false,
    default: node.default,
  };
  const renderAs = node.renderAs ?? scalars[node.type as keyof typeof scalars];

  switch (renderAs) {
    case "text":
    case "richtext":
    case "numeric":
    case "boolean":
    case "datepicker":
      return { ...base, renderAs };
    case "select":
      return { ...base, renderAs, options: node.enum ?? [] };
    case "relation":
    case "multi_relation":
    case "file":
    case "multi_file":
      return {
        ...base,
        renderAs,
        model: node.model ?? "",
        labelKey: node.labelKey,
      };
    case "object":
      return { ...base, renderAs, members: toFields(node) };
    case "array": {
      const element = node.items && toItem(node.items);
      return element && { ...base, renderAs, element };
    }
    default: {
      const fallback = scalars[node.type as keyof typeof scalars];
      return fallback && { ...base, renderAs: fallback };
    }
  }
};

// The fields of an object schema, in the order the server lists them.
export const toFields = (schema: SchemaNode): Field[] =>
  Object.entries(schema.properties ?? {}).flatMap(([key, node]) => {
    const item = toItem(node);
    if (!item) return [];

    const required =
      !!schema.required?.includes(key) &&
      item.default === undefined &&
      !item.nullable;

    return [{ ...item, key, required }];
  });

export const toModelSchema = ({ schema, ...rest }: RawSchema): ModelSchema => ({
  ...rest,
  fields: toFields(schema),
});
