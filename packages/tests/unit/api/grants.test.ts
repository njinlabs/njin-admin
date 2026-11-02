import { expect, test } from "bun:test";
import {
  accessCatalogQuery,
  type CatalogEntry,
  getAccessCatalog,
  hasFullAccess,
  joinGrants,
  splitGrants,
} from "../../../src/sdk/api";
import { capture } from "./capture";

const catalog: CatalogEntry[] = [
  { resource: "post", actions: ["read", "create", "update"], scoped: true },
  { resource: "vars.site", actions: ["read", "write"], scoped: false },
];

test("getAccessCatalog reads what a grant can name", async () => {
  const { client, sent } = capture({ data: catalog });

  expect(await getAccessCatalog(client)).toEqual(catalog);
  expect(sent[0]).toMatchObject({ method: "get", url: "/api/access/catalog" });
  expect([...accessCatalogQuery(client).queryKey]).toEqual([
    "access",
    "catalog",
  ]);
});

test("splitGrants puts a grant of one resource and one action in a cell", () => {
  expect(
    splitGrants(["post:read", "post:update:own", "vars.site:write"], catalog),
  ).toEqual({
    rules: {
      "post:read": "all",
      "post:update": "own",
      "vars.site:write": "all",
    },
    rest: [],
  });
});

test("splitGrants keeps what no cell can hold", () => {
  const { rules, rest } = splitGrants(
    ["*:*:all", "post:*", "*:read", "ghost:read", "post:publish", "nonsense"],
    catalog,
  );

  expect(rules).toEqual({});
  expect(rest).toEqual([
    "*:*:all",
    "post:*",
    "*:read",
    "ghost:read",
    "post:publish",
    "nonsense",
  ]);
});

test("splitGrants does not read own on a resource with no owner", () => {
  expect(splitGrants(["vars.site:read:own"], catalog)).toEqual({
    rules: {},
    rest: ["vars.site:read:own"],
  });
});

test("the widest scope of a cell wins, whatever the order", () => {
  for (const grants of [
    ["post:read:own", "post:read"],
    ["post:read", "post:read:own"],
  ]) {
    expect(splitGrants(grants, catalog).rules).toEqual({ "post:read": "all" });
  }
});

test("joinGrants writes cells in catalog order, then the rest", () => {
  expect(
    joinGrants(
      { "vars.site:read": "all", "post:update": "own", "post:read": "all" },
      ["post:*"],
      catalog,
    ),
  ).toEqual(["post:read", "post:update:own", "vars.site:read", "post:*"]);
});

test("what splitGrants takes apart joinGrants puts back", () => {
  const grants = ["post:read", "post:create:own", "vars.site:write", "*:*:all"];
  const { rules, rest } = splitGrants(grants, catalog);

  expect(joinGrants(rules, rest, catalog).sort()).toEqual([...grants].sort());
});

test("hasFullAccess looks for the grant that does everything", () => {
  expect(hasFullAccess(["post:read", "*:*:all"])).toBe(true);
  expect(hasFullAccess(["*:*:own", "post:*"])).toBe(false);
});
