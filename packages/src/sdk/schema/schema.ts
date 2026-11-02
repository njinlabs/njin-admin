import z from "zod";
import { toRawId } from "./raw-id";

export type Form = {
  key: string;
  label: string;
  type:
    | "array"
    | "datepicker"
    | "numeric"
    | "object"
    | "select"
    | "file"
    | "multi_file"
    | "relation"
    | "multi_relation"
    | "text"
    | "email"
    | "richtext"
    | "boolean";
  members?: Form[];
  element?: Omit<Form, "key">;
  options?: Readonly<Record<string, unknown>>;
  model?: string;
  labelKey?: string;
  unique?: boolean;
};

const unwrap = (value: z.ZodType) => {
  let currentType = value;
  let isOptional = false;
  let isNullable = false;

  while (
    currentType instanceof z.ZodOptional ||
    currentType instanceof z.ZodNullable
  ) {
    if (currentType instanceof z.ZodOptional) {
      currentType = currentType.unwrap() as z.ZodType;
      isOptional = true;
    } else if (currentType instanceof z.ZodNullable) {
      currentType = currentType.unwrap() as z.ZodType;
      isNullable = true;
    }
  }

  // `withMeta` is where `z.fromJSONSchema` actually registers metadata (it wraps
  // a field with `.default()` *before* attaching meta), so `.meta()` must be
  // called there. `type` peels that default wrapper too, for structural checks
  // like `.type === "enum"` / `instanceof z.ZodObject`.
  const withMeta = currentType;
  const type =
    withMeta instanceof z.ZodDefault
      ? (withMeta.unwrap() as z.ZodType)
      : withMeta;

  return { type, withMeta, isOptional, isNullable };
};

const extractId = (val: unknown): unknown => {
  // Backend ids come formatted as `table:id` (e.g. "file:xyz789") — only the
  // raw id part is accepted back on write endpoints (relation/file FKs).
  if (
    val &&
    typeof val === "object" &&
    "id" in (val as Record<string, unknown>) &&
    (val as Record<string, unknown>).id != null
  ) {
    return toRawId(String((val as Record<string, unknown>).id));
  }

  if (typeof val === "string") return toRawId(val);

  return val;
};

const rewrap = (
  schema: z.ZodType,
  withMeta: z.ZodType,
  isNullable: boolean,
  isOptional: boolean,
  // Relation/file fields flatten their original value shape down to a plain id string
  // (see transformSchema below) — their own `.default()` value needs the same treatment,
  // so callers pass `extractId`-shaped mappers here instead of forwarding it as-is.
  mapDefault: (val: unknown) => unknown = (val) => val,
): z.ZodType => {
  let result = schema;

  if (withMeta instanceof z.ZodDefault) {
    const defaultValue = mapDefault((withMeta as any)._zod.def.defaultValue);
    // `.default()` returns a brand-new ZodDefault instance — zod's `.meta()` registry
    // is keyed by schema identity, not inherited through wrapping, so the meta already
    // attached to `schema` (by transformType/transformSchema, right before calling here)
    // would otherwise vanish. `withMeta` is the pre-transform node, which `unwrap()`
    // guarantees already carries the correct meta (see its own comment) — re-read it
    // and re-attach after wrapping so toForm()/getDefaultValues() can still find it.
    const meta = (withMeta as any).meta?.();
    result = result.default(defaultValue);
    if (meta) result = result.meta(meta);
  }

  if (isNullable) result = result.nullable();
  if (isOptional) result = result.optional();

  return result;
};

// Recurses into plain `object`/`array` fields so relation/file fields nested inside
// them (e.g. an array-of-objects member, per `ArrayForm`) also get their ids extracted
// before submit — `transformSchema`'s own loop only walks the top-level shape. Each
// field's own meta (label/renderAs) is re-attached since rebuilding the schema drops it.
const transformType = (type: z.ZodType): z.ZodType => {
  const { type: inner, withMeta, isOptional, isNullable } = unwrap(type);
  const meta = (withMeta as any).meta?.();

  if (inner instanceof z.ZodObject) {
    const transformed = meta
      ? transformSchema(inner).meta(meta)
      : transformSchema(inner);
    return rewrap(transformed, withMeta, isNullable, isOptional);
  }

  if (inner instanceof z.ZodArray) {
    const elementTransformed = transformType(inner.element as z.ZodType);
    const arrayTransformed = meta
      ? z.array(elementTransformed).meta(meta)
      : z.array(elementTransformed);
    return rewrap(arrayTransformed, withMeta, isNullable, isOptional);
  }

  return type;
};

export const transformSchema = (
  existingSchema: z.ZodObject<any>,
): z.ZodObject<any> => {
  const newShape: { [x: string]: z.ZodType } = {};

  for (const [key, value] of Object.entries(existingSchema.shape)) {
    const { withMeta, isOptional, isNullable } = unwrap(value as z.ZodType);

    const meta = (withMeta as any).meta?.();

    if (meta?.renderAs === "relation" || meta?.renderAs === "file") {
      // The submitted value must always end up a plain id string regardless of how the
      // backend declared the field (nested object vs. already a string) — `z.preprocess`
      // coerces the raw picked value *before* validating it against the final target type,
      // unlike `.transform()` which validates the raw input against the original type first.
      const finalField: z.ZodType = z
        .preprocess((val) => (val ? extractId(val) : val), z.string())
        .meta(meta);

      newShape[key] = rewrap(
        finalField,
        withMeta,
        isNullable,
        isOptional,
        extractId,
      );
    } else if (
      meta?.renderAs === "multi_relation" ||
      meta?.renderAs === "multi_file"
    ) {
      const finalField: z.ZodType = z
        .preprocess(
          (val) => (Array.isArray(val) ? val.map(extractId) : val),
          z.array(z.string()),
        )
        .meta(meta);

      newShape[key] = rewrap(
        finalField,
        withMeta,
        isNullable,
        isOptional,
        (val) => (Array.isArray(val) ? val.map(extractId) : val),
      );
    } else {
      newShape[key] = transformType(value as z.ZodType);
    }
  }

  return z.object(newShape);
};

const parseArray = (input: z.ZodArray) => {
  const { type: elementType, withMeta } = unwrap(input.element as z.ZodType);
  const meta: { label: string; renderAs: Form["type"] } = (
    withMeta as any
  ).meta() as any;
  const form: Form["element"] = {
    type: meta.renderAs,
    label: meta.label,
  };

  if (elementType.type === "array") {
    form.element = parseArray(elementType as z.ZodArray);
  } else if (elementType.type === "object") {
    form.members = toForm(elementType as z.ZodObject);
  }

  return form;
};

export const getDefaultValues = (
  input: z.ZodObject<any>,
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(input.shape)) {
    const { type, withMeta } = unwrap(rawValue as z.ZodType);

    if (withMeta instanceof z.ZodDefault) {
      const defaultValue = (withMeta as any)._zod.def.defaultValue;
      defaults[key] =
        typeof defaultValue === "function" ? defaultValue() : defaultValue;
    } else if (type.type === "object") {
      const nested = getDefaultValues(type as z.ZodObject<any>);
      if (Object.keys(nested).length) defaults[key] = nested;
    }
  }

  return defaults;
};

export const toForm = <const T extends Readonly<{ [x: string]: z.ZodType }>>(
  input: z.ZodObject<T>,
) => {
  const forms: Form[] = [];

  for (const [key, rawValue] of Object.entries(input.shape)) {
    const { type: value, withMeta } = unwrap(rawValue as z.ZodType);
    const meta: {
      label: string;
      renderAs: Form["type"];
      model?: string;
      labelKey?: string;
      unique?: boolean;
    } = (withMeta as any).meta() as any;
    const form: Form = {
      type: meta.renderAs,
      label: meta.label,
      key,
      unique: meta.unique,
    };

    if (
      value.type === "object" &&
      form.type !== "relation" &&
      form.type !== "file"
    ) {
      form.members = toForm(value as z.ZodObject);
    } else if (
      value.type === "array" &&
      meta.renderAs !== "multi_relation" &&
      meta.renderAs !== "multi_file"
    ) {
      form.element = parseArray(value as z.ZodArray);
    } else if (value.type === "enum") {
      form.options = (value as z.ZodEnum).enum;
    } else if (form.type === "relation" || form.type === "multi_relation") {
      form.model = meta.model;
      form.labelKey = meta.labelKey;
    }

    forms.push(form);
  }

  return forms;
};
