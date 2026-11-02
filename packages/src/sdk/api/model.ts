import { queryOptions } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

// A record as the server returns it. Narrow it per model: `readRecords<Post>(...)`.
export type Row = { id: string } & Record<string, unknown>;

export type Page<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; pageCount: number };
};

type FilterValue = string | number | boolean;

// filters: { status: "PUBLISH" } is equality; { price: { $gte: 100 } } picks an operator.
// For $in pass the values joined with commas.
type Filters = Record<
  string,
  | FilterValue
  | Partial<
      Record<
        | "$eq"
        | "$ne"
        | "$gt"
        | "$gte"
        | "$lt"
        | "$lte"
        | "$contains"
        | "$startsWith"
        | "$in",
        FilterValue
      >
    >
>;

export type ReadQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  // "none" loads no relations; a list loads only those.
  populate?: "none" | string[];
  // Fields to return ("relation.field" for one level into a relation). id is always included.
  select?: string[];
  filters?: Filters;
  // One language of a model with i18n.
  locale?: string;
  // false: a missing translation stays missing instead of falling back to the default language.
  fallback?: boolean;
};

export type DraftAction = "publish" | "unpublish" | "discard";

// The query string the server expects: lists comma-joined, fallback as "true" / "false".
// Undefined keys are dropped by axios.
export const toParams = (query: ReadQuery = {}) => {
  const { populate, select, fallback, ...rest } = query;

  return {
    ...rest,
    populate: Array.isArray(populate) ? populate.join(",") : populate,
    select: select?.join(","),
    fallback: fallback === undefined ? undefined : String(fallback),
  };
};

// GET /api/<prefix>
export const readRecords = async <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  query?: ReadQuery,
): Promise<Page<T>> => {
  const { data } = await client.get<Page<T>>(`/api/${prefix}`, {
    params: toParams(query),
  });

  return data;
};

// GET /api/<prefix>/:id
export const showRecord = async <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  id: string,
  query?: Pick<ReadQuery, "locale" | "fallback">,
): Promise<T> => {
  const { data } = await client.get<{ data: T }>(`/api/${prefix}/${id}`, {
    params: toParams(query),
  });

  return data.data;
};

// POST /api/<prefix>. Input is the model's fields without the generated ones.
export const createRecord = async <
  T extends Row = Row,
  Input extends Record<string, unknown> = Record<string, unknown>,
>(
  client: AxiosInstance,
  prefix: string,
  input: Input,
): Promise<T> => {
  const { data } = await client.post<{ data: T }>(`/api/${prefix}`, input);

  return data.data;
};

// PUT /api/<prefix>/:id. Only the fields sent change.
export const updateRecord = async <
  T extends Row = Row,
  Input extends Record<string, unknown> = Record<string, unknown>,
>(
  client: AxiosInstance,
  prefix: string,
  id: string,
  input: Partial<Input>,
): Promise<T> => {
  const { data } = await client.put<{ data: T }>(`/api/${prefix}/${id}`, input);

  return data.data;
};

// DELETE /api/<prefix>/:id
export const destroyRecord = async <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  id: string,
): Promise<T> => {
  const { data } = await client.delete<{ data: T }>(`/api/${prefix}/${id}`);

  return data.data;
};

// DELETE /api/<prefix>/:id/locale/:locale. Only for models with i18n.
export const removeLocale = async <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  id: string,
  locale: string,
): Promise<T> => {
  const { data } = await client.delete<{ data: T }>(
    `/api/${prefix}/${id}/locale/${locale}`,
  );

  return data.data;
};

// POST /api/<prefix>/:id/<action>. Only for draftable models. For i18n models, locales limits
// it to those languages; leave it out for every language.
export const draftAction = async <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  id: string,
  action: DraftAction,
  locales?: string[],
): Promise<T> => {
  const { data } = await client.post<{ data: T }>(
    `/api/${prefix}/${id}/${action}`,
    undefined,
    { params: { locale: locales?.join(",") } },
  );

  return data.data;
};

// Every call for one model, with its types fixed once:
//   const posts = modelApi<Post, PostInput>(client, "post");
//   const { data, meta } = await posts.read({ page: 2, filters: { status: "PUBLISH" } });
export const modelApi = <
  T extends Row = Row,
  Input extends Record<string, unknown> = Record<string, unknown>,
>(
  client: AxiosInstance,
  prefix: string,
) => ({
  read: (query?: ReadQuery) => readRecords<T>(client, prefix, query),
  show: (id: string, query?: Pick<ReadQuery, "locale" | "fallback">) =>
    showRecord<T>(client, prefix, id, query),
  create: (input: Input) => createRecord<T, Input>(client, prefix, input),
  update: (id: string, input: Partial<Input>) =>
    updateRecord<T, Input>(client, prefix, id, input),
  destroy: (id: string) => destroyRecord<T>(client, prefix, id),
  removeLocale: (id: string, locale: string) =>
    removeLocale<T>(client, prefix, id, locale),
  draft: (id: string, action: DraftAction, locales?: string[]) =>
    draftAction<T>(client, prefix, id, action, locales),
});

// Query options for useQuery / prefetch. Keys nest by model, so
// queryClient.invalidateQueries({ queryKey: ["model", prefix] }) refreshes every list and
// record of that model after a write.
export const recordsQuery = <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  query?: ReadQuery,
) =>
  queryOptions({
    queryKey: ["model", prefix, "list", query],
    queryFn: () => readRecords<T>(client, prefix, query),
  });

export const recordQuery = <T extends Row = Row>(
  client: AxiosInstance,
  prefix: string,
  id: string,
  query?: Pick<ReadQuery, "locale" | "fallback">,
) =>
  queryOptions({
    queryKey: ["model", prefix, "show", id, query],
    queryFn: () => showRecord<T>(client, prefix, id, query),
  });
