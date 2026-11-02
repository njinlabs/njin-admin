import axios, { type AxiosInstance, isAxiosError } from "axios";

export * from "./analytics";
export * from "./file";
export * from "./model";
export * from "./setup";
export * from "./vars";

// The one axios instance for talking to the njin server. Same origin by default (the admin is
// served by njin); in dev Vite proxies /api to the server.
export const createClient = (baseURL = "") => axios.create({ baseURL });

// A plugin the server lists: where its script is, and the stylesheets built with it.
export type ManifestPlugin = {
  name: string;
  entry: string;
  styles?: string[];
};

export type Manifest = { plugins: ManifestPlugin[] };

// GET /api/admin/manifest
export const getManifest = async (client: AxiosInstance): Promise<Manifest> => {
  const { data } = await client.get<Manifest>("/api/admin/manifest");

  return data;
};

// What a failed request tells the user. fields is by the dotted path of the form field
// ("seo.title"), for the errors that belong to one: validation (422) and unique (409).
export type ApiError = {
  status?: number;
  message: string;
  fields: Record<string, string>;
};

type ErrorBody = {
  message?: string;
  field?: string;
  errors?: { path?: string; message?: string }[];
};

// Any thrown value as an ApiError, from the bodies njin sends: { message },
// { message, errors: [{ path, message }] } and { message, field }.
export const toApiError = (error: unknown): ApiError => {
  if (!isAxiosError<ErrorBody>(error)) {
    return {
      message: error instanceof Error ? error.message : "Something went wrong",
      fields: {},
    };
  }

  const { response } = error;
  if (!response) {
    return { message: "Could not reach the server", fields: {} };
  }

  const { message, field, errors = [] } = response.data ?? {};
  const fields: Record<string, string> = {};

  for (const entry of errors) {
    // The first message of a field is the one to show.
    if (entry.path && entry.message && !(entry.path in fields)) {
      fields[entry.path] = entry.message;
    }
  }
  if (field && message) fields[field] = message;

  return {
    status: response.status,
    message: message ?? error.message,
    fields,
  };
};
