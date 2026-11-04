import { checkToken, type Row, toApiError } from "@njinlabs/njin-admin/sdk";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { client } from "./client";

// Who is signed in, asked of the server: the session is an HttpOnly cookie, which the page cannot
// read, so the only way to know is to use it. `null` is "nobody" (the server answered 401), not a
// failure; anything else that goes wrong is an error.
export const sessionKey = ["token"] as const;

export const sessionQuery = () =>
  queryOptions({
    queryKey: sessionKey,
    queryFn: async (): Promise<Row | null> => {
      try {
        return await checkToken(client);
      } catch (error) {
        if (toApiError(error).status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });

type Failed = {
  response?: { status?: number };
  config?: { url?: string };
};

// These answer 401 for reasons that are not an expired session: a wrong password, nobody signed in
// yet (which is what `Protected` is asking), a logout that arrives late.
const NOT_EXPIRY = [
  "/api/auth/login",
  "/api/auth/check-token",
  "/api/auth/logout",
];

// Calls `onExpired` when the server refuses the session in the middle of it: a 401 on any request
// other than the ones above. Returns the function that stops watching.
export const watchExpiry = (
  client: {
    interceptors: {
      response: {
        use: (
          onFulfilled: undefined,
          onRejected: (error: unknown) => Promise<never>,
        ) => number;
        eject: (id: number) => void;
      };
    };
  },
  onExpired: () => void,
) => {
  const id = client.interceptors.response.use(undefined, (error) => {
    const { response, config } = (error ?? {}) as Failed;

    if (response?.status === 401 && !NOT_EXPIRY.includes(config?.url ?? "")) {
      onExpired();
    }

    return Promise.reject(error);
  });

  return () => client.interceptors.response.eject(id);
};

// Drops what was loaded for the session that ended (schema, permissions, records, settings, ...).
// What is not about the user stays: whether the first admin exists, and who is signed in, which
// `Protected` is still watching.
export const clearSession = (queryClient: QueryClient) =>
  queryClient.removeQueries({
    predicate: ({ queryKey: [scope] }) =>
      scope !== "setup-status" && scope !== "token",
  });

// The session is over (signed out, or the server ended it): nobody is signed in any more, which
// `Protected` answers by sending the page to the login.
export const endSession = (queryClient: QueryClient) => {
  clearSession(queryClient);
  queryClient.setQueryData(sessionKey, null);
};
