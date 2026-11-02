import type { PluginRoute } from "@njinlabs/njin-admin/sdk";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import type { FC } from "react";
import { Protected } from "../components/protected";
import { Root } from "../components/root";
import { LoginPage } from "../pages/login";
import { SetupPage } from "../pages/setup";

export type RouterContext = { queryClient: QueryClient };

type Options = {
  routes: PluginRoute[];
  queryClient: QueryClient;
  // Only tests pass these: a memory history (the browser's is the default) and replacements for
  // the two layers that ask the server something.
  root?: FC;
  layout?: FC;
  history?: RouterHistory;
};

// Code-based routes: the tree is built from a list at runtime, after the plugins are loaded,
// which a generated file-based tree cannot do. Paths of plugins and models are not known when
// the admin is compiled, so links to them are not type-checked.
export const createAdminRouter = ({
  routes,
  queryClient,
  root: rootComponent = Root,
  layout = Protected,
  history,
}: Options) => {
  const root = createRootRouteWithContext<RouterContext>()({
    component: rootComponent,
  });

  // The pages that need the sidebar sit under a pathless layout; the login page does not. Signed out,
  // the layout sends you to the login page, and the login page sends a signed-in user back.
  const shell = createRoute({
    getParentRoute: () => root,
    id: "shell",
    component: layout,
  });

  const login = createRoute({
    getParentRoute: () => root,
    path: "/login",
    component: LoginPage,
  });

  const setup = createRoute({
    getParentRoute: () => root,
    path: "/setup",
    component: SetupPage,
  });

  const children = routes.map(({ path, component }) =>
    createRoute({ getParentRoute: () => shell, path, component }),
  );

  return createRouter({
    routeTree: root.addChildren([setup, login, shell.addChildren(children)]),
    basepath: "/_admin",
    context: { queryClient },
    defaultNotFoundComponent: () => <p>Not found</p>,
    history,
  });
};
