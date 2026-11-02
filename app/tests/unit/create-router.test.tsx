import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { createAdminRouter } from "../../src/lib/create-router";

const render = async (
  url: string,
  routes: Parameters<typeof createAdminRouter>[0]["routes"],
) => {
  const router = createAdminRouter({
    routes,
    queryClient: new QueryClient(),
    root: Outlet,
    layout: Outlet,
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  await router.load();

  return { router, html: renderToString(<RouterProvider router={router} />) };
};

const routes = [
  { path: "/", component: () => <p>home</p> },
  { path: "/reports", component: () => <p>reports page</p> },
];

describe("createAdminRouter", () => {
  test("serves each route under /_admin", async () => {
    expect((await render("/_admin/", routes)).html).toContain("home");
    expect((await render("/_admin/reports", routes)).html).toContain(
      "reports page",
    );
  });

  test("a plugin page can read its params from the shared router", async () => {
    const { Route } = await import("./params-route");
    const { html } = await render("/_admin/reports/42", [Route]);

    // React puts a comment between the text and the value it renders.
    expect(html.replace(/<!-- -->/g, "")).toContain("report 42");
  });

  test("the query client is on the router context", async () => {
    const queryClient = new QueryClient();
    const router = createAdminRouter({
      routes,
      queryClient,
      root: Outlet,
      layout: Outlet,
      history: createMemoryHistory({ initialEntries: ["/_admin/"] }),
    });

    expect(router.options.context.queryClient).toBe(queryClient);
  });

  test("an unknown path matches no route", async () => {
    const { html } = await render("/_admin/nope", routes);

    expect(html).not.toContain("home");
  });
});
