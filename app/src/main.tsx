import * as sdk from "@njinlabs/njin-admin/sdk";
import { exposeShared } from "@njinlabs/njin-admin/shared";
import * as ui from "@njinlabs/njin-admin/ui";
import * as reactQuery from "@tanstack/react-query";
import * as reactRouter from "@tanstack/react-router";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { CookiesProvider } from "react-cookie";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createAdminRouter } from "./lib/create-router";
import { loadPlugins, routes } from "./lib/registry";

exposeShared({
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "react-dom": ReactDOM,
  "@tanstack/react-query": reactQuery,
  "@tanstack/react-router": reactRouter,
  "@njinlabs/njin-admin/sdk": sdk,
  "@njinlabs/njin-admin/ui": ui,
});

await loadPlugins();

const queryClient = new reactQuery.QueryClient();
const router = createAdminRouter({
  routes: [...routes.main, ...routes.plugins],
  queryClient,
});

// Placeholder: proves app -> sdk -> registry is wired. Replaced by the real shell.
createRoot(document.getElementById("root")!).render(
  <CookiesProvider>
    <reactQuery.QueryClientProvider client={queryClient}>
      <reactRouter.RouterProvider router={router} />
    </reactQuery.QueryClientProvider>
  </CookiesProvider>,
);
