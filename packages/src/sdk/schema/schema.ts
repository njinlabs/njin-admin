import z from "zod";

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
  // A field of a model with i18n that has a value per language. `type` and the rest describe the
  // value of one language; the field itself is a map of locale to that value.
  localized?: boolean;
};

// `z.fromJSONSchema` reads `anyOf: [X, { type: "null" }]`, which is how a nullable field is written,
// as a union rather than a ZodNullable. This is the X of such a union, if the type is one.
const nullableInner = (value: z.ZodType): z.ZodType | undefined => {
  if (!(value instanceof z.ZodUnion)) return undefined;

  const options = value.options as z.ZodType[];
  const rest = options.filter((option) => !(option instanceof z.ZodNull));

  return options.length === 2 && rest.length === 1 ? rest[0] : undefined;
};

const unwrap = (value: z.ZodType) => {
  let currentType = value;
  let isOptional = false;
  let isNullable = false;

  while (
    currentType instanceof z.ZodOptional ||
    currentType instanceof z.ZodNullable ||
    nullableInner(currentType)
  ) {
    if (currentType instanceof z.ZodOptional) {
      currentType = currentType.unwrap() as z.ZodType;
      isOptional = true;
    } else if (currentType instanceof z.ZodNullable) {
      currentType = currentType.unwrap() as z.ZodType;
      isNullable = true;
    } else {
      currentType = nullableInner(currentType) as z.ZodType;
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
  // Ids are plain strings (a UUID, or what the adapter makes). A picked record comes back as
  // an object with an id, and a link is written as just that id.
  if (
    val &&
    typeof val === "object" &&
    "id" in (val as Record<string, unknown>) &&
    (val as Record<string, unknown>).id != null
  ) {
    return String((val as Record<string, unknown>).id);
  }

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
// What an array was told about its length (.min(), .max()). A rebuilt array starts without it,
// so it is carried over, or the rebuilt one would accept what the server refuses.
const checksOf = (schema: z.ZodType) => (schema as any)._zod.def.checks ?? [];

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
    const rebuilt = z.array(elementTransformed).check(...checksOf(inner));
    const arrayTransformed = meta ? rebuilt.meta(meta) : rebuilt;
    return rewrap(arrayTransformed, withMeta, isNullable, isOptional);
  }

  return type;
};

// What a localized field is: a map of locale to the value of one language. z.fromJSONSchema reads
// it as an object whose catchall is the schema of one language, and the rebuilt one (below) as a
// record; either way this is the schema of one language.
const perLocaleOf = (value: z.ZodType): z.ZodType | undefined =>
  value instanceof z.ZodRecord
    ? (value.valueType as z.ZodType)
    : (value as any)._zod.def.out?._zod.def.catchall;

const transformField = (value: z.ZodType): z.ZodType => {
  const { type: original, withMeta, isOptional, isNullable } = unwrap(value);

  const meta = (withMeta as any).meta?.();

  // Each language is a field of its own, so a file picked in one is reduced to its id like any
  // other, and the map is rebuilt around that.
  const perLocale = meta?.localized && perLocaleOf(original);
  if (perLocale) {
    return rewrap(
      z.record(z.string(), transformField(perLocale)).meta(meta),
      withMeta,
      isNullable,
      isOptional,
    );
  }

  if (meta?.renderAs === "relation" || meta?.renderAs === "file") {
    // The submitted value must always end up a plain id string regardless of how the
    // backend declared the field (nested object vs. already a string) — `z.preprocess`
    // coerces the raw picked value *before* validating it against the final target type,
    // unlike `.transform()` which validates the raw input against the original type first.
    const finalField: z.ZodType = z
      .preprocess((val) => (val ? extractId(val) : val), z.string())
      .meta(meta);

    return rewrap(finalField, withMeta, isNullable, isOptional, extractId);
  }

  if (meta?.renderAs === "multi_relation" || meta?.renderAs === "multi_file") {
    const finalField: z.ZodType = z
      .preprocess(
        (val) => (Array.isArray(val) ? val.map(extractId) : val),
        z.array(z.string()).check(...checksOf(original)),
      )
      .meta(meta);

    return rewrap(finalField, withMeta, isNullable, isOptional, (val) =>
      Array.isArray(val) ? val.map(extractId) : val,
    );
  }

  return transformType(value);
};

export const transformSchema = (
  existingSchema: z.ZodObject<any>,
): z.ZodObject<any> =>
  z.object(
    Object.fromEntries(
      Object.entries(existingSchema.shape).map(([key, value]) => [
        key,
        transformField(value as z.ZodType),
      ]),
    ),
  );

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

const toField = (key: string, rawValue: z.ZodType): Form => {
  const { type: value, withMeta } = unwrap(rawValue);
  const meta: {
    label: string;
    renderAs: Form["type"];
    model?: string;
    labelKey?: string;
    unique?: boolean;
  } = (withMeta as any).meta() as any;

  // A localized field is a map of locale to value (`{ id: "...", en: "..." }`). z.fromJSONSchema
  // reads it as an object whose catchall is the schema of one language: that schema says how to
  // draw a language, the map only names the field.
  const perLocale =
    (meta as { localized?: boolean }).localized && perLocaleOf(value);
  if (perLocale) {
    return { ...toField(key, perLocale), label: meta.label, localized: true };
  }

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

  return form;
};

export const toForm = <const T extends Readonly<{ [x: string]: z.ZodType }>>(
  input: z.ZodObject<T>,
) =>
  Object.entries(input.shape).map(([key, rawValue]) =>
    toField(key, rawValue as z.ZodType),
  );
