import type {
  AdminPluginConfig,
  FieldProps,
  NavEntry,
  Permissions,
  PluginRoute,
  Schema,
  Widget,
} from "@njinlabs/njin-admin/sdk";
import { can, canList, getManifest } from "@njinlabs/njin-admin/sdk";
import { contractProblem } from "@njinlabs/njin-admin/shared";
import type { FC } from "react";
import {
  PiFolderOpenDuotone,
  PiGearDuotone,
  PiSquaresFourDuotone,
  PiStackDuotone,
  PiUsersDuotone,
} from "react-icons/pi";
import { ComponentsPage } from "../pages/components";
import { ConnectionsPage } from "../pages/connections";
import { ContentFormPage } from "../pages/content-form";
import { ContentListPage } from "../pages/content-list";
import { DashboardPage } from "../pages/dashboard";
import { FilesPage } from "../pages/files";
import { SettingsPage } from "../pages/settings";
import { GroupFormPage } from "../pages/users/group-form";
import { GroupsListPage } from "../pages/users/groups-list";
import { UserFormPage } from "../pages/users/user-form";
import { UsersListPage } from "../pages/users/users-list";
import { mainWidgets } from "../widgets";
import { client } from "./client";

export const navs = {
  main: [
    {
      icon: () => <PiSquaresFourDuotone />,
      label: "Dashboard",
      to: "/",
    },
    {
      icon: () => <PiFolderOpenDuotone />,
      label: "Files",
      to: "/files",
    },
    {
      icon: () => <PiUsersDuotone />,
      label: "Users",
      to: "/users",
    },
  ] as NavEntry[],
  plugins: [] as NavEntry[],
};

// Tiles of the dashboard: the admin's own, then the plugins'.
// `key` is "<plugin>:<id>": a widget id is only unique within its plugin, and the dashboard
// remembers a person's choices by this key.
export type RegisteredWidget = Widget & { key: string };
export const widgets = {
  main: mainWidgets,
  plugins: [] as RegisteredWidget[],
};

// What plugins draw fields with, by "<plugin>:<renderer>".
export const fieldRenderers: Record<string, FC<FieldProps>> = {};

// The pages of the admin, in the order the router gets them: its own first, then the plugins'.
export const routes = {
  main: [
    { path: "/", component: DashboardPage },
    { path: "/files", component: FilesPage },
    { path: "/users", component: UsersListPage },
    { path: "/users/new", component: UserFormPage },
    { path: "/users/$id/edit", component: UserFormPage },
    { path: "/users/groups", component: GroupsListPage },
    { path: "/users/groups/new", component: GroupFormPage },
    { path: "/users/groups/$id/edit", component: GroupFormPage },
    { path: "/connections", component: ConnectionsPage },
    { path: "/content/$prefix", component: ContentListPage },
    { path: "/content/$prefix/new", component: ContentFormPage },
    { path: "/content/$prefix/$id/edit", component: ContentFormPage },
    { path: "/settings/$prefix", component: SettingsPage },
    // Kit showcase; reachable by URL only, it is not a menu entry.
    { path: "/components", component: ComponentsPage },
  ] as PluginRoute[],
  plugins: [] as PluginRoute[],
};

const addStylesheet = (href: string) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
};

// Returns what kept a plugin out, so the page can say so (the console is not where an admin looks).
export const loadPlugins = async () => {
  const problems: string[] = [];
  // njin core does not serve the manifest yet. Until it does the request fails (or the dev server
  // answers with the page itself), and there are simply no plugins.
  // The timeout matters: the page waits for this before it draws anything.
  const manifest = await getManifest(client, { timeout: 5000 }).catch(
    () => null,
  );
  if (!Array.isArray(manifest?.plugins)) return problems;

  const { plugins } = manifest;

  for (const { name, entry, styles = [], contract } of plugins) {
    // Checked before anything of the plugin is loaded, so a wrong build adds no styles either.
    const problem = contractProblem(name, contract);
    if (problem) {
      console.error(problem);
      problems.push(problem);
      continue;
    }

    // A plugin that cannot be loaded (404, a script that throws) must not stop the admin from
    // drawing: main.tsx waits for this, so an uncaught error here leaves the page blank.
    try {
      for (const href of styles) addStylesheet(href);

      const plugin: { default: AdminPluginConfig } = await import(
        /* @vite-ignore */
        entry
      );
      registerPlugin(plugin.default);
    } catch (error) {
      const problem = `Plugin "${name}" could not be loaded: ${error instanceof Error ? error.message : String(error)}`;
      console.error(problem, error);
      problems.push(problem);
    }
  }

  return problems;
};

// What a plugin adds goes into the lists the shell, the router and the forms read.
export const registerPlugin = ({
  name,
  navs: pluginNavs = [],
  routes: pluginRoutes = [],
  widgets: pluginWidgets = [],
  fields = {},
}: AdminPluginConfig) => {
  navs.plugins.push(...pluginNavs);
  routes.plugins.push(...pluginRoutes);
  widgets.plugins.push(
    ...pluginWidgets.map((widget) => ({
      ...widget,
      key: `${name}:${widget.id}`,
    })),
  );

  for (const [renderer, component] of Object.entries(fields)) {
    const key = `${name}:${renderer}`;
    if (key in fieldRenderers)
      console.warn(`Field renderer "${key}" is registered twice`);
    fieldRenderers[key] = component;
  }
};

// Models and settings groups come from the server, so the menu follows what njin has registered
// and what the user may do with it. The schema already leaves out what they can do nothing with;
// this also drops a model they could only pick from a relation or only write to, since the page of
// a model is its list.

// The admin's own entries; Files and Users need their resource, the dashboard is for everyone.
const guarded: Record<string, string> = { "/files": "file", "/users": "user" };

export const mainNavs = (permissions: Permissions) =>
  navs.main.filter(
    ({ to }) => !guarded[to] || canList(permissions, guarded[to]),
  );

export const schemaNavs = (
  { models, vars }: Pick<Schema, "models" | "vars">,
  permissions: Permissions,
) => ({
  models: models
    .filter((model) => canList(permissions, model.prefix))
    .map((model) => ({
      icon: () => <PiStackDuotone />,
      label: model.name,
      to: `/content/${model.prefix}`,
    })) as NavEntry[],
  vars: vars
    .filter((group) => can(permissions, `vars.${group.prefix}`, "read"))
    .map((group) => ({
      icon: () => <PiGearDuotone />,
      label: group.name,
      to: `/settings/${group.prefix}`,
    })) as NavEntry[],
});
