import type { FC } from "react";

export type NavEntry = {
  icon: FC;
  label: string;
  to: string;
};

// A page the plugin adds. The admin wraps it in a route, so inside the component use the hooks
// of @tanstack/react-router (useParams, Link, useNavigate) as in any page of the admin.
export type PluginRoute = {
  // Relative to the admin, e.g. "/reports" or "/reports/$id".
  path: string;
  component: FC;
};

export type AdminPluginConfig = {
  navs: NavEntry[];
  routes?: PluginRoute[];
};

export const defineAdminPlugin = (config: AdminPluginConfig) => config;
export * from "./api";
export * from "./schema";
