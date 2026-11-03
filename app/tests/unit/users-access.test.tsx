import { expect, test } from "bun:test";
import {
  createClient,
  type Permissions,
  SessionContext,
} from "@njinlabs/njin-admin/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { createAdminRouter } from "../../src/lib/create-router";
import { routes } from "../../src/lib/registry";

// A page of the admin as the router serves it, for a caller with these permissions.
const visit = async (url: string, permissions: Permissions) => {
  const queryClient = new QueryClient();
  const router = createAdminRouter({
    routes: routes.main,
    queryClient,
    root: Outlet,
    layout: Outlet,
    history: createMemoryHistory({ initialEntries: [`/_admin${url}`] }),
  });
  await router.load();

  return renderToString(
    <QueryClientProvider client={queryClient}>
      <SessionContext
        value={{ user: { id: "u1" }, permissions, client: createClient() }}
      >
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  );
};

const readOnly: Permissions = [
  { resource: "user", scoped: true, actions: { read: "all" } },
  { resource: "access_group", scoped: true, actions: { read: "all" } },
];

test("every page of users and groups says so when the caller has no access", async () => {
  for (const url of [
    "/users",
    "/users/new",
    "/users/u2/edit",
    "/users/groups",
    "/users/groups/new",
    "/users/groups/g1/edit",
  ]) {
    expect(await visit(url, [])).toContain("do not have access");
  }
});

test("reading is not enough to open a form", async () => {
  expect(await visit("/users/new", readOnly)).toContain("do not have access");
  expect(await visit("/users/groups/new", readOnly)).toContain(
    "do not have access",
  );
});

test("the list opens with the tabs when the caller may read both", async () => {
  const html = await visit("/users", readOnly);

  expect(html).not.toContain("do not have access");
  expect(html).toContain("/users/groups");
});

test("the tabs leave out the groups for a caller who cannot read them", async () => {
  const html = await visit("/users", [readOnly[0] as Permissions[number]]);

  expect(html).not.toContain("/users/groups");
});
