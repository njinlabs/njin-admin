import { queryOptions } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { type ModelSchema, type RawSchema, toModelSchema } from "./model";
import { toVarsSchema, type VarsSchema } from "./vars";

export * from "./model";
export * from "./vars";

// The languages of the site; null when config.i18n is not set.
export type I18n = { locales: string[]; defaultLocale: string };

export type Schema = {
  models: ModelSchema[];
  vars: VarsSchema[];
  i18n: I18n | null;
};

// GET /api/schema
export const getSchema = async (client: AxiosInstance): Promise<Schema> => {
  const { data } = await client.get<{
    models: RawSchema[];
    vars: RawSchema[];
    i18n: I18n | null;
  }>("/api/schema");

  return {
    models: data.models.map(toModelSchema),
    vars: data.vars.map(toVarsSchema),
    i18n: data.i18n,
  };
};

export const schemaQuery = (client: AxiosInstance) =>
  queryOptions({
    queryKey: ["schema"],
    queryFn: () => getSchema(client),
  });
