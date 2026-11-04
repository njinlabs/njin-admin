import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

// An app (an MCP client such as Claude) the signed-in user has let act on their behalf: one per
// client. Managed with a session only, so an app cannot widen its own access.
export type Connection = {
  id: string;
  clientId: string;
  clientName: string;
  // "<resource>:<action>" entries; "*:*" is everything the user can do.
  scopes: string[];
  grantedAt: string | null;
  lastUsedAt: string | null;
  // How many tokens the app holds right now.
  tokens: number;
};

export const everything = "*:*";

// GET /api/oauth/consents
export const getConnections = async (
  client: AxiosInstance,
): Promise<Connection[]> => {
  const { data } = await client.get<{ data: Connection[] }>(
    "/api/oauth/consents",
  );

  return data.data;
};

export const connectionsQuery = (client: AxiosInstance) =>
  queryOptions({
    queryKey: ["oauth", "connections"],
    queryFn: () => getConnections(client),
  });

// PUT /api/oauth/consents/:id. Access can be narrowed, never widened (a 422 otherwise); what the
// app already holds shrinks with it.
export const updateConnection = async (
  client: AxiosInstance,
  id: string,
  scopes: string[],
): Promise<Connection> => {
  const { data } = await client.put<{ data: Connection }>(
    `/api/oauth/consents/${id}`,
    { scopes },
  );

  return data.data;
};

export const updateConnectionMutation = (
  client: AxiosInstance,
  queryClient: QueryClient,
) =>
  mutationOptions({
    mutationFn: ({ id, scopes }: { id: string; scopes: string[] }) =>
      updateConnection(client, id, scopes),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["oauth", "connections"] }),
  });

// DELETE /api/oauth/consents/:id. The app's tokens go with it, so it stops working at once.
export const revokeConnection = async (client: AxiosInstance, id: string) => {
  await client.delete(`/api/oauth/consents/${id}`);
};

export const revokeConnectionMutation = (
  client: AxiosInstance,
  queryClient: QueryClient,
) =>
  mutationOptions({
    mutationFn: (id: string) => revokeConnection(client, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["oauth", "connections"] }),
  });

// What the authorization page was opened with: the OAuth query string, as the client sent it
// (`client_id`, `redirect_uri`, `code_challenge`, `state`, `scope`, `resource`, ...). The admin
// forwards it untouched; the server validates every part.
export type AuthorizeRequest = Record<string, string>;

export type Authorization = {
  client: { id: string; name: string };
  // Where the client will be sent back to, spelled out: that, not the client's own display name,
  // is where the authorization code goes.
  host: string;
  // What the user may hand out and the client asked for, to choose from.
  scopes: string[];
  // Set when the user approved this client for at least this much before: nothing to ask, go
  // there.
  redirect?: string;
};

// GET /api/oauth/authorize?<the client's query>. A client or redirect address the server does not
// know is a 400: show it, never go there.
export const getAuthorization = async (
  client: AxiosInstance,
  request: AuthorizeRequest,
): Promise<Authorization> => {
  const { data } = await client.get<{ data: Authorization }>(
    "/api/oauth/authorize",
    { params: request },
  );

  return data.data;
};

export const authorizationQuery = (
  client: AxiosInstance,
  request: AuthorizeRequest,
) =>
  queryOptions({
    queryKey: ["oauth", "authorize", request],
    queryFn: () => getAuthorization(client, request),
    retry: false,
    // The page is a single decision; reloading it on focus would hand out a fresh code.
    staleTime: Number.POSITIVE_INFINITY,
  });

// POST /api/oauth/authorize. `redirect` is where the client is sent back to, with the code (or
// the denial) in its query.
export const decideAuthorization = async (
  client: AxiosInstance,
  request: AuthorizeRequest,
  decision: { action: "approve" | "deny"; grant?: string[] },
): Promise<{ redirect: string }> => {
  const { data } = await client.post<{ data: { redirect: string } }>(
    "/api/oauth/authorize",
    { ...request, ...decision },
  );

  return data.data;
};

const verbs: Record<string, string> = {
  read: "Read",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  publish: "Publish",
  write: "Change",
};

// "post:update" as "Edit post", "vars.site:write" as "Change the “site” settings".
export const describeScope = (scope: string) => {
  const [resource = "", action = ""] = scope.split(":");
  if (scope === everything) return "Do everything you can do";

  const what = resource.startsWith("vars.")
    ? `the “${resource.slice(5)}” settings`
    : resource;

  return `${verbs[action] ?? action} ${what}`;
};

// The scopes grouped by resource, in the order they come, for a list that reads in blocks.
export const groupScopes = (scopes: string[]) => {
  const groups = new Map<string, string[]>();

  for (const scope of scopes) {
    const resource = scope.split(":")[0] ?? scope;
    groups.set(resource, [...(groups.get(resource) ?? []), scope]);
  }

  return [...groups];
};
