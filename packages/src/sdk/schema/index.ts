import { queryOptions } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import z from "zod";
import { type Form, toForm, transformSchema } from "./schema";

export * from "./raw-id";
export * from "./schema";

// The languages of the site; null when config.i18n is not set.
export type I18n = { locales: string[]; defaultLocale: string };

// One entry of GET /api/schema, as the server sends it.
type SchemaItem = {
  name: string;
  prefix: string;
  draftable: boolean;
  i18n: boolean;
  schema: z.core.JSONSchema.JSONSchema;
};

// A model or a settings group: the one zod schema made from the server's JSON schema (ids of
// relations and files already reduced to a plain id), and the form read from it.
export type ModelSchema = Omit<SchemaItem, "schema"> & {
  form: Form[];
  schema: z.ZodObject;
};

export type Schema = {
  models: ModelSchema[];
  vars: ModelSchema[];
  i18n: I18n | null;
};

const build = (item: SchemaItem): ModelSchema => {
  const schema = transformSchema(z.fromJSONSchema(item.schema) as z.ZodObject);

  return { ...item, form: toForm(schema), schema };
};

// GET /api/schema
export const getSchema = async (client: AxiosInstance): Promise<Schema> => {
  const { data } = await client.get<{
    models: SchemaItem[];
    vars: SchemaItem[];
    i18n: I18n | null;
  }>("/api/schema");

  return {
    models: data.models.map(build),
    vars: data.vars.map(build),
    i18n: data.i18n,
  };
};

export const schemaQuery = (client: AxiosInstance) =>
  queryOptions({
    queryKey: ["schema"],
    queryFn: () => getSchema(client),
  });
