import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { CookiesProvider } from "react-cookie";
import { renderToString } from "react-dom/server";
import { createAdminRouter } from "../../src/lib/create-router";

// The login page as the router serves it, reached with `state` as `Protected` sends it.
const visit = async (state?: object) => {
  const queryClient = new QueryClient();
  const history = createMemoryHistory({ initialEntries: ["/_admin/login"] });
  const router = createAdminRouter({
    routes: [],
    queryClient,
    root: Outlet,
    layout: Outlet,
    history,
  });
  if (state) history.replace("/_admin/login", state);
  await router.load();

  return renderToString(
    <CookiesProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CookiesProvider>,
  );
};

test("tells someone sent here by a session that ended", async () => {
  expect(await visit({ expired: true })).toContain("Your session has ended");
});

test("says nothing to someone who simply arrives signed out", async () => {
  expect(await visit()).not.toContain("Your session has ended");
});
