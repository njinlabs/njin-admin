import { describe, expect, test } from "bun:test";
import {
  createClient,
  type Permissions,
  type PluginRoute,
  SessionContext,
  visible,
} from "@njinlabs/njin-admin/sdk";
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { createAdminRouter } from "../../src/lib/create-router";
import {
  fieldRenderers,
  registerPlugin,
  widgets,
} from "../../src/lib/registry";
import { DashboardPage } from "../../src/pages/dashboard";

const reports: Permissions = [
  { resource: "report", scoped: false, actions: { read: "all" } },
];

const session = (permissions: Permissions, children: React.ReactNode) => (
  <SessionContext
    value={{ user: { id: "u1" }, permissions, client: createClient() }}
  >
    {children}
  </SessionContext>
);

describe("visible", () => {
  const items = [
    { id: "a", order: 2 },
    { id: "b", requires: { resource: "report", action: "read" } },
    { id: "c", order: 1 },
    { id: "d" },
  ];

  test("drops what the user may not use and sorts by order, keeping ties as registered", () => {
    expect(visible(items, reports).map((i) => i.id)).toEqual([
      "b",
      "d",
      "c",
      "a",
    ]);
    expect(visible(items, []).map((i) => i.id)).toEqual(["d", "c", "a"]);
  });
});

describe("a plugin's page", () => {
  const routes: PluginRoute[] = [
    {
      path: "/reports",
      component: () => <p>reports page</p>,
      requires: { resource: "report", action: "read" },
    },
    { path: "/open", component: () => <p>open page</p> },
  ];

  const visit = async (url: string, permissions: Permissions) => {
    const router = createAdminRouter({
      routes,
      queryClient: new QueryClient(),
      root: Outlet,
      layout: Outlet,
      history: createMemoryHistory({ initialEntries: [`/_admin${url}`] }),
    });
    await router.load();

    return renderToString(
      session(permissions, <RouterProvider router={router} />),
    );
  };

  test("shows only to someone who has the permission it asks for", async () => {
    expect(await visit("/reports", reports)).toContain("reports page");
    expect(await visit("/reports", [])).toContain("do not have access");
  });

  test("a page that asks for nothing is open to everyone", async () => {
    expect(await visit("/open", [])).toContain("open page");
  });
});

describe("registerPlugin", () => {
  test("namespaces the renderers with the plugin's name", () => {
    const Slug = () => null;
    registerPlugin({ name: "reports", fields: { slugify: Slug } });

    expect(fieldRenderers["reports:slugify"]).toBe(Slug);
  });
});

describe("the dashboard", () => {
  const render = (permissions: Permissions) =>
    renderToString(session(permissions, <DashboardPage />));

  test("says so when no plugin adds a widget", () => {
    widgets.plugins.length = 0;

    expect(render(reports)).toContain("Nothing here yet");
  });

  test("shows the widgets the user may see, and not the others", () => {
    registerPlugin({
      name: "reports",
      widgets: [
        {
          id: "total",
          title: "Total",
          component: () => <p>total widget</p>,
          requires: { resource: "report", action: "read" },
        },
        { id: "all", component: () => <p>everyone widget</p> },
      ],
    });

    const allowed = render(reports);
    expect(allowed).toContain("total widget");
    expect(allowed).toContain("everyone widget");

    const denied = render([]);
    expect(denied).not.toContain("total widget");
    expect(denied).toContain("everyone widget");
    widgets.plugins.length = 0;
  });

  test("a widget that throws does not take the others down", () => {
    registerPlugin({
      name: "reports",
      widgets: [
        {
          id: "broken",
          component: () => {
            throw new Error("boom");
          },
        },
        { id: "fine", component: () => <p>fine widget</p> },
      ],
    });

    const html = render(reports);
    widgets.plugins.length = 0;

    expect(html).toContain("fine widget");
  });
});
