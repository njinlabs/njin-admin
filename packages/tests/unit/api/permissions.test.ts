import { expect, test } from "bun:test";
import {
  can,
  canList,
  canOn,
  getPermissions,
  type Permissions,
  permissionsQuery,
} from "../../../src/sdk/api";
import { capture } from "./capture";

const permissions: Permissions = [
  {
    resource: "post",
    scoped: true,
    actions: { read: "all", create: "all", update: "own" },
  },
  { resource: "author", scoped: true, actions: { read: "ref" } },
  { resource: "vars.general", scoped: false, actions: { read: "all" } },
];

test("getPermissions reads what the server worked out", async () => {
  const { client, sent } = capture({ data: permissions });

  expect(await getPermissions(client)).toEqual(permissions);
  expect(sent[0]).toMatchObject({
    method: "get",
    url: "/api/auth/permissions",
  });
});

test("permissionsQuery is keyed so logout can drop it", () => {
  expect([...permissionsQuery(capture().client).queryKey]).toEqual([
    "permissions",
  ]);
});

test("can answers with the level, or false for what is not there", () => {
  expect(can(permissions, "post", "create")).toBe("all");
  expect(can(permissions, "post", "update")).toBe("own");
  expect(can(permissions, "post", "delete")).toBe(false);
  expect(can(permissions, "author", "read")).toBe("ref");
  expect(can(permissions, "page", "read")).toBe(false);
  expect(can(permissions, "vars.general", "write")).toBe(false);
});

test("canOn lets an own level touch only the user's rows", () => {
  const mine = { id: "p1", createdBy: "u1" };
  const populated = { id: "p2", createdBy: { id: "u1", name: "Ada" } };
  const theirs = { id: "p3", createdBy: "u2" };

  expect(canOn(permissions, "post", "update", mine, "u1")).toBe(true);
  expect(canOn(permissions, "post", "update", populated, "u1")).toBe(true);
  expect(canOn(permissions, "post", "update", theirs, "u1")).toBe(false);
});

test("canOn at all level ignores the owner, and a ref level or no level never passes", () => {
  const theirs = { id: "p3", createdBy: "u2" };

  expect(canOn(permissions, "post", "read", theirs, "u1")).toBe(true);
  expect(canOn(permissions, "author", "read", theirs, "u1")).toBe(false);
  expect(canOn(permissions, "post", "delete", theirs, "u1")).toBe(false);
});

test("canList is for a level that can be browsed, not a ref or a write-only one", () => {
  expect(canList(permissions, "post")).toBe(true);
  expect(canList(permissions, "author")).toBe(false);
  expect(canList(permissions, "page")).toBe(false);
});
