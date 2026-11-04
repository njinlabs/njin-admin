import { expect, test } from "bun:test";
import { SessionContext } from "@njinlabs/njin-admin/sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { CookiesProvider } from "react-cookie";
import { renderToString } from "react-dom/server";
import { client } from "../../src/lib/client";
import { createAdminRouter } from "../../src/lib/create-router";
import { isSafeRedirect, requestOf } from "../../src/pages/authorize";
import { safeRedirect } from "../../src/pages/login";

test("the request is read from the address as it was sent", () => {
  expect(
    requestOf("?client_id=k&state=123&scope=post%3Aread+file%3Aread"),
  ).toEqual({
    client_id: "k",
    state: "123",
    scope: "post:read file:read",
  });
});

test("the client is only sent to an address that runs no script", () => {
  expect(isSafeRedirect("https://claude.ai/api/mcp/auth_callback?code=1")).toBe(
    true,
  );
  expect(isSafeRedirect("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(
    true,
  );
  expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
  expect(isSafeRedirect("data:text/html,x")).toBe(false);
  expect(isSafeRedirect("/relative")).toBe(false);
});

test("login returns only to a page of this admin", () => {
  expect(safeRedirect("/_admin/oauth/authorize?client_id=k")).toBe(
    "/_admin/oauth/authorize?client_id=k",
  );
  expect(safeRedirect("//evil.test")).toBeUndefined();
  expect(safeRedirect("/\\evil.test")).toBeUndefined();
  expect(safeRedirect("https://evil.test")).toBeUndefined();
  expect(safeRedirect(undefined)).toBeUndefined();
});

test("the authorize page sits outside the shell, under the router's bare layout", async () => {
  const queryClient = new QueryClient();
  const router = createAdminRouter({
    routes: [],
    queryClient,
    root: Outlet,
    layout: () => <p>shell</p>,
    bare: () => (
      <SessionContext
        value={{ user: { id: "1", email: "a@b.co" }, permissions: [], client }}
      >
        <div id="bare">
          <Outlet />
        </div>
      </SessionContext>
    ),
    history: createMemoryHistory({
      initialEntries: ["/_admin/oauth/authorize?client_id=k"],
    }),
  });
  await router.load();

  const html = renderToString(
    <CookiesProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CookiesProvider>,
  );

  expect(html).toContain('id="bare"');
  expect(html).not.toContain("shell");
});
