import { expect, test } from "bun:test";
import {
  createToken,
  createTokenMutation,
  getTokens,
  revokeToken,
  revokeTokenMutation,
} from "../../../src/sdk/api";
import { capture, runMutation } from "./capture";

test("getTokens lists the credentials of the signed-in user", async () => {
  const { client, uri } = capture({ data: [{ id: "t1", kind: "pat" }] });

  expect(await getTokens(client)).toEqual([{ id: "t1", kind: "pat" }] as never);
  expect(uri()).toBe("/api/token");
});

test("createToken posts the name and scopes and returns the bearer", async () => {
  const { client, sent } = capture({
    data: { id: "t1", name: "Deploy", token: "njt:t1:secret" },
  });

  const created = await createToken(client, {
    name: "Deploy",
    scopes: ["post:read"],
  });

  expect(created.token).toBe("njt:t1:secret");
  expect(sent[0]).toMatchObject({ method: "post", url: "/api/token" });
  expect(JSON.parse(sent[0]?.data)).toEqual({
    name: "Deploy",
    scopes: ["post:read"],
  });
});

test("revokeToken deletes the token", async () => {
  const { client, sent } = capture({ data: { id: "t1" } });

  await revokeToken(client, "t1");

  expect(sent[0]).toMatchObject({ method: "delete", url: "/api/token/t1" });
});

test("creating and revoking refresh the list of tokens", async () => {
  const { client } = capture({ data: { id: "t1" } });
  const invalidated: unknown[] = [];
  const queryClient = {
    invalidateQueries: async (filter: unknown) => {
      invalidated.push(filter);
    },
  };

  await runMutation(createTokenMutation(client, queryClient as never), {
    name: "Deploy",
    scopes: ["*:*"],
  });
  await runMutation(revokeTokenMutation(client, queryClient as never), "t1");

  // Not ["token"], which is the session check and survives signing out.
  expect(invalidated).toEqual([
    { queryKey: ["tokens"] },
    { queryKey: ["tokens"] },
  ]);
});
