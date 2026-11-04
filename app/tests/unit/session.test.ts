import { describe, expect, test } from "bun:test";
import { createClient } from "@njinlabs/njin-admin/sdk";
import { QueryClient } from "@tanstack/react-query";
import {
  clearSession,
  endSession,
  sessionKey,
  watchExpiry,
} from "../../src/lib/session";

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
  test("signs out when the server refuses the session on a request", async () => {
    const client = server(401);
    let expired = 0;
    watchExpiry(client, () => expired++);

    await expect(client.get("/api/post")).rejects.toThrow();

    expect(expired).toBe(1);
  });

  test("leaves a 401 that is not an ended session alone (a wrong password, nobody signed in yet)", async () => {
    const client = server(401);
    let expired = 0;
    watchExpiry(client, () => expired++);

    await expect(client.post("/api/auth/login")).rejects.toThrow();
    await expect(client.get("/api/auth/check-token")).rejects.toThrow();
    await expect(client.delete("/api/auth/logout")).rejects.toThrow();

    expect(expired).toBe(0);
  });

  test("leaves other failures to the page that asked", async () => {
    const client = server(403);
    let expired = 0;
    watchExpiry(client, () => expired++);

    await expect(client.get("/api/post")).rejects.toThrow();

    expect(expired).toBe(0);
  });

  test("stops when told to", async () => {
    const client = server(401);
    let expired = 0;
    const stop = watchExpiry(client, () => expired++);
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
    queryClient.setQueryData(["token"], 1);

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

describe("endSession", () => {
  test("clears the session and leaves nobody signed in", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["permissions"], 1);
    queryClient.setQueryData(sessionKey, { id: "u1" });

    endSession(queryClient);

    expect(queryClient.getQueryData(["permissions"])).toBeUndefined();
    expect(queryClient.getQueryData(sessionKey)).toBeNull();
  });
});
