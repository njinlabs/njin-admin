import { describe, expect, test } from "bun:test";
import { createClient } from "@njinlabs/njin-admin/sdk";
import { QueryClient } from "@tanstack/react-query";
import { clearSession, watchExpiry } from "../../src/lib/session";

// A client whose server answers every request with `status`.
const server = (status: number) => {
  const client = createClient();

  client.defaults.adapter = async (config) => {
    const response = {
      data: {},
      status,
      statusText: "",
      headers: {},
      config,
    };

    if (status >= 400) {
      throw Object.assign(new Error("failed"), {
        isAxiosError: true,
        response,
        config,
      });
    }

    return response;
  };

  return client;
};

describe("watchExpiry", () => {
  test("signs out when the server refuses the token in use", async () => {
    const client = server(401);
    client.defaults.headers.common.Authorization = "Bearer t1";
    let expired = 0;
    watchExpiry(client, "t1", () => expired++);

    await expect(client.get("/api/post")).rejects.toThrow();

    expect(expired).toBe(1);
  });

  test("leaves a 401 on a request without the token alone (a wrong password)", async () => {
    const client = server(401);
    let expired = 0;
    watchExpiry(client, "t1", () => expired++);

    await expect(client.post("/api/auth/login")).rejects.toThrow();

    expect(expired).toBe(0);
  });

  test("leaves a 401 for a token that has been replaced", async () => {
    const client = server(401);
    client.defaults.headers.common.Authorization = "Bearer t2";
    let expired = 0;
    watchExpiry(client, "t1", () => expired++);

    await expect(client.get("/api/post")).rejects.toThrow();

    expect(expired).toBe(0);
  });

  test("leaves other failures to the page that asked", async () => {
    const client = server(403);
    client.defaults.headers.common.Authorization = "Bearer t1";
    let expired = 0;
    watchExpiry(client, "t1", () => expired++);

    await expect(client.get("/api/post")).rejects.toThrow();

    expect(expired).toBe(0);
  });

  test("stops when told to", async () => {
    const client = server(401);
    client.defaults.headers.common.Authorization = "Bearer t1";
    let expired = 0;
    const stop = watchExpiry(client, "t1", () => expired++);
    stop();

    await expect(client.get("/api/post")).rejects.toThrow();

    expect(expired).toBe(0);
  });
});

describe("clearSession", () => {
  test("drops what belongs to the session and keeps the rest", () => {
    const queryClient = new QueryClient();

    for (const key of ["schema", "permissions", "model", "vars", "access"]) {
      queryClient.setQueryData([key, "x"], 1);
    }
    queryClient.setQueryData(["setup-status"], 1);
    queryClient.setQueryData(["token", "t1"], 1);

    clearSession(queryClient);

    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .map(({ queryKey }) => queryKey[0])
        .sort(),
    ).toEqual(["setup-status", "token"]);
  });
});
