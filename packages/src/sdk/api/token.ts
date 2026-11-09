import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

// A credential of the signed-in user. `pat` is a personal access token made on purpose for a script;
// `session` and `oauth` are listed too (a sign-in, a connected app) and are managed elsewhere.
export type Token = {
  id: string;
  name: string | null;
  kind: "session" | "pat" | "oauth";
  clientId: string | null;
  // "<resource>:<action>" entries; "*:*" is everything the user can do.
  scopes: string[];
  createdAt: string | null;
  // A personal token never expires: it works until it is revoked.
  expiresAt: string | null;
  lastUsedAt: string | null;
};

// GET /api/token. Managed with a session only, so a token cannot mint its own replacement.
export const getTokens = async (client: AxiosInstance): Promise<Token[]> => {
  const { data } = await client.get<{ data: Token[] }>("/api/token");

  return data.data;
};

export const tokensQuery = (client: AxiosInstance) =>
  queryOptions({
    // Not ["token"]: that is the session check, which `clearSession` keeps.
    queryKey: ["tokens"],
    queryFn: () => getTokens(client),
  });

// What POST /api/token answers: the token's record and the bearer itself, shown this once (the
// server keeps only a hash of it).
export type CreatedToken = Token & { token: string };

// POST /api/token. The scopes can never go beyond what the user can do.
export const createToken = async (
  client: AxiosInstance,
  input: { name: string; scopes: string[] },
): Promise<CreatedToken> => {
  const { data } = await client.post<{ data: CreatedToken }>(
    "/api/token",
    input,
  );

  return data.data;
};

export const createTokenMutation = (
  client: AxiosInstance,
  queryClient: QueryClient,
) =>
  mutationOptions({
    mutationFn: (input: { name: string; scopes: string[] }) =>
      createToken(client, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tokens"] }),
  });

// DELETE /api/token/:id. It stops working at once.
export const revokeToken = async (client: AxiosInstance, id: string) => {
  await client.delete(`/api/token/${id}`);
};

export const revokeTokenMutation = (
  client: AxiosInstance,
  queryClient: QueryClient,
) =>
  mutationOptions({
    mutationFn: (id: string) => revokeToken(client, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tokens"] }),
  });
