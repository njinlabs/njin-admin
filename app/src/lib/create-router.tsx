import type { PluginRoute } from "@njinlabs/njin-admin/sdk";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import { Shell } from "../components/shell";

export type RouterContext = { queryClient: QueryClient };

type Options = {
  routes: PluginRoute[];
  queryClient: QueryClient;
  // Only tests pass this (memory history); the browser's is the default.
  history?: RouterHistory;
};

// Code-based routes: the tree is built from a list at runtime, after the plugins are loaded,
// which a generated file-based tree cannot do. Paths of plugins and models are not known when
// the admin is compiled, so links to them are not type-checked.
export const createAdminRouter = ({
  routes,
  queryClient,
  history,
}: Options) => {
  const root = createRootRouteWithContext<RouterContext>()({
    component: Shell,
  });

  const children = routes.map(({ path, component }) =>
    createRoute({ getParentRoute: () => root, path, component }),
  );

  return createRouter({
    routeTree: root.addChildren(children),
    basepath: "/_admin",
    context: { queryClient },
    defaultNotFoundComponent: () => <p>Not found</p>,
    history,
  });
};
