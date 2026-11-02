import { expect, test } from "bun:test";
import { createFirstAdmin, getSetupStatus } from "../../../src/sdk/api";
import { capture } from "./capture";

test("getSetupStatus tells whether the first admin is missing", async () => {
  const { client, uri } = capture({ needsSetup: true });

  expect(await getSetupStatus(client)).toEqual({ needsSetup: true });
  expect(uri()).toBe("/api/setup/status");
});

test("createFirstAdmin posts the account and returns the token", async () => {
  const { client, sent } = capture({
    data: { token: "token:1:abc", user: { id: "u1" } },
  });
  const input = { name: "A", email: "a@b.co", password: "12345678" };

  const result = await createFirstAdmin(client, input);

  expect(result.token).toBe("token:1:abc");
  expect(sent[0]).toMatchObject({ method: "post", url: "/api/setup" });
  expect(JSON.parse(sent[0]?.data)).toEqual(input);
});
