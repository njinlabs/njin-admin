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
