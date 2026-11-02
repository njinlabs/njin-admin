import axios, { type InternalAxiosRequestConfig } from "axios";

// An axios client that answers every request with `body` and records what was sent.
export const capture = (body: unknown = { data: { id: "1" } }) => {
  const sent: InternalAxiosRequestConfig[] = [];
  const client = axios.create({
    adapter: async (config) => {
      sent.push(config);
      return { data: body, status: 200, statusText: "OK", headers: {}, config };
    },
  });

  return { client, sent, uri: (i = 0) => client.getUri(sent[i]!) };
};

// Runs a mutation's function and then its onSuccess, the way useMutation would, without React.
export const runMutation = async <V>(
  options: {
    mutationFn?: (variables: V, context: never) => Promise<unknown>;
    onSuccess?: (...args: never[]) => unknown;
  },
  variables: V,
) => {
  const data = await options.mutationFn?.(variables, undefined as never);
  await options.onSuccess?.(
    data as never,
    variables as never,
    undefined as never,
    undefined as never,
  );
};
