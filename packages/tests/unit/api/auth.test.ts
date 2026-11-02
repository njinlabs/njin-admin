import { expect, test } from "bun:test";
import { checkToken, login, logout } from "../../../src/sdk/api";
import { capture } from "./capture";

test("login posts the credentials and splits the token from the user", async () => {
  const { client, sent } = capture({
    data: { id: "u1", email: "a@b.co", token: "njt:1:abc" },
  });
  const input = { email: "a@b.co", password: "12345678" };

  const result = await login(client, input);

  expect(result).toEqual({
    token: "njt:1:abc",
    user: { id: "u1", email: "a@b.co" },
  });
  expect(sent[0]).toMatchObject({ method: "post", url: "/api/auth/login" });
  expect(JSON.parse(sent[0]?.data)).toEqual(input);
});

test("logout deletes the session", async () => {
  const { client, sent } = capture({ data: { id: "u1" } });

  await logout(client);

  expect(sent[0]).toMatchObject({ method: "delete", url: "/api/auth/logout" });
});

test("checkToken returns the signed-in user", async () => {
  const { client, uri } = capture({ data: { id: "u1" } });

  expect(await checkToken(client)).toEqual({ id: "u1" });
  expect(uri()).toBe("/api/auth/check-token");
});
