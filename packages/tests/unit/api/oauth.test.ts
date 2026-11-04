import { expect, test } from "bun:test";
import {
  decideAuthorization,
  describeScope,
  getAuthorization,
  getConnections,
  groupScopes,
  revokeConnection,
  revokeConnectionMutation,
  updateConnection,
} from "../../../src/sdk/api";
import { capture } from "./capture";

test("getConnections lists the consents of the signed-in user", async () => {
  const { client, uri } = capture({
    data: [{ id: "c1", clientName: "Claude" }],
  });

  expect(await getConnections(client)).toEqual([
    { id: "c1", clientName: "Claude" },
  ] as never);
  expect(uri()).toBe("/api/oauth/consents");
});

test("updateConnection puts the narrowed scopes", async () => {
  const { client, sent } = capture({
    data: { id: "c1", scopes: ["post:read"] },
  });

  await updateConnection(client, "c1", ["post:read"]);

  expect(sent[0]).toMatchObject({
    method: "put",
    url: "/api/oauth/consents/c1",
  });
  expect(JSON.parse(sent[0]?.data)).toEqual({ scopes: ["post:read"] });
});

test("revokeConnection deletes the consent", async () => {
  const { client, sent } = capture({ data: { id: "c1" } });

  await revokeConnection(client, "c1");

  expect(sent[0]).toMatchObject({
    method: "delete",
    url: "/api/oauth/consents/c1",
  });
});

test("revoking refreshes the list of connections", async () => {
  const { client } = capture({ data: { id: "c1" } });
  const invalidated: unknown[] = [];
  const queryClient = {
    invalidateQueries: async (filter: unknown) => {
      invalidated.push(filter);
    },
  };

  const options = revokeConnectionMutation(client, queryClient as never);
  await options.mutationFn?.("c1", undefined as never);
  await options.onSuccess?.(
    undefined as never,
    "c1",
    undefined as never,
    undefined as never,
  );

  expect(invalidated).toEqual([{ queryKey: ["oauth", "connections"] }]);
});

test("getAuthorization sends the client's query untouched", async () => {
  const { client, uri } = capture({
    data: {
      client: { id: "k", name: "Claude" },
      host: "claude.ai",
      scopes: [],
    },
  });

  const result = await getAuthorization(client, {
    client_id: "k",
    state: "123",
  });

  expect(result.host).toBe("claude.ai");
  expect(uri()).toBe("/api/oauth/authorize?client_id=k&state=123");
});

test("decideAuthorization posts the query with the decision", async () => {
  const { client, sent } = capture({ data: { redirect: "https://x.test/cb" } });

  const result = await decideAuthorization(
    client,
    { client_id: "k" },
    { action: "approve", grant: ["post:read"] },
  );

  expect(result.redirect).toBe("https://x.test/cb");
  expect(sent[0]).toMatchObject({
    method: "post",
    url: "/api/oauth/authorize",
  });
  expect(JSON.parse(sent[0]?.data)).toEqual({
    client_id: "k",
    action: "approve",
    grant: ["post:read"],
  });
});

test("describeScope reads a scope as a sentence", () => {
  expect(describeScope("post:update")).toBe("Edit post");
  expect(describeScope("vars.site:write")).toBe("Change the “site” settings");
  expect(describeScope("*:*")).toBe("Do everything you can do");
  expect(describeScope("post:archive")).toBe("archive post");
});

test("groupScopes keeps one block per resource, in order", () => {
  expect(groupScopes(["a:read", "b:read", "a:update"])).toEqual([
    ["a", ["a:read", "a:update"]],
    ["b", ["b:read"]],
  ]);
});
