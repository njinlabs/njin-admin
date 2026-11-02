import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { type ReadQuery, toParams } from "./model";

// GET /api/vars/<prefix>. published: true reads what is live, for draftable groups.
export const getVars = async <T extends Record<string, unknown>>(
  client: AxiosInstance,
  prefix: string,
  query?: Pick<ReadQuery, "locale" | "fallback"> & { published?: boolean },
): Promise<T> => {
  const { published, ...rest } = query ?? {};
  const { data } = await client.get<{ data: T }>(
    `/api/vars/${prefix}${published ? "/published" : ""}`,
    { params: toParams(rest) },
  );

  return data.data;
};

// PUT /api/vars/<prefix>. Only the fields sent change.
export const updateVars = async <T extends Record<string, unknown>>(
  client: AxiosInstance,
  prefix: string,
  input: Partial<T>,
): Promise<T> => {
  const { data } = await client.put<{ data: T }>(`/api/vars/${prefix}`, input);

  return data.data;
};

// Invalidate with queryClient.invalidateQueries({ queryKey: ["vars", prefix] }) after a write.
export const varsQuery = <T extends Record<string, unknown>>(
  client: AxiosInstance,
  prefix: string,
  query?: Pick<ReadQuery, "locale" | "fallback"> & { published?: boolean },
) =>
  queryOptions({
    queryKey: ["vars", prefix, query],
    queryFn: () => getVars<T>(client, prefix, query),
  });

// Refreshes the group (working copy and published) when the write succeeds.
export const updateVarsMutation = <T extends Record<string, unknown>>(
  client: AxiosInstance,
  queryClient: QueryClient,
  prefix: string,
) =>
  mutationOptions({
    mutationFn: (input: Partial<T>) => updateVars<T>(client, prefix, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["vars", prefix] }),
  });
