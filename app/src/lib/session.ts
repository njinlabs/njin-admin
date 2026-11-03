import type { QueryClient } from "@tanstack/react-query";

type Failed = {
  response?: { status?: number };
  config?: { headers?: { Authorization?: unknown } };
};

// Calls `onExpired` when the server refuses the session in the middle of it: a 401 on a request
// that carried this token. A 401 without it (a wrong password at login) is not an expired session,
// and neither is one for a token that has since been replaced. Returns the function that stops
// watching.
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
  token: string,
  onExpired: () => void,
) => {
  const id = client.interceptors.response.use(undefined, (error) => {
    const { response, config } = (error ?? {}) as Failed;

    if (
      response?.status === 401 &&
      config?.headers?.Authorization === `Bearer ${token}`
    ) {
      onExpired();
    }

    return Promise.reject(error);
  });

  return () => client.interceptors.response.eject(id);
};

// Drops what was loaded for the session that ended (schema, permissions, records, settings, ...).
// What is not about the user stays: whether the first admin exists, and the token's own check,
// which `Protected` is still watching.
export const clearSession = (queryClient: QueryClient) =>
  queryClient.removeQueries({
    predicate: ({ queryKey: [scope] }) =>
      scope !== "setup-status" && scope !== "token",
  });
