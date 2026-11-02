import type {
  AdminPluginConfig,
  NavEntry,
  PluginRoute,
  Schema,
} from "@njinlabs/njin-admin/sdk";
import { getManifest } from "@njinlabs/njin-admin/sdk";
import {
  PiFolderOpenDuotone,
  PiGearDuotone,
  PiSquaresFourDuotone,
  PiStackDuotone,
  PiUsersDuotone,
} from "react-icons/pi";
import { ComponentsPage } from "../pages/components";
import { ContentListPage } from "../pages/content-list";
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

const Dashboard = () => (
  <div className="space-y-4">
    <div className="rounded-control border border-border bg-surface p-4 text-muted-foreground">
      Nothing here yet.
    </div>
  </div>
);

// The pages of the admin, in the order the router gets them: its own first, then the plugins'.
export const routes = {
  main: [
    { path: "/", component: Dashboard },
    // Dummy pages until the real ones exist.
    { path: "/files", component: Dashboard },
    { path: "/users", component: Dashboard },
    { path: "/content/$prefix", component: ContentListPage },
    { path: "/settings/$prefix", component: Dashboard },
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

export const loadPlugins = async () => {
  // njin core does not serve the manifest yet. Until it does the request fails (or the dev server
  // answers with the page itself), and there are simply no plugins.
  const manifest = await getManifest(client).catch(() => null);
  if (!Array.isArray(manifest?.plugins)) return;

  const { plugins } = manifest;

  for (const { entry, styles = [] } of plugins) {
    for (const href of styles) addStylesheet(href);

    const plugin: { default: AdminPluginConfig } = await import(
      /* @vite-ignore */
      entry
    );
    navs.plugins.push(...plugin.default.navs);
    routes.plugins.push(...(plugin.default.routes ?? []));
  }
};

// Models and settings groups come from the server, so the menu follows what njin has registered.
export const schemaNavs = ({
  models,
  vars,
}: Pick<Schema, "models" | "vars">) => ({
  models: models.map((model) => ({
    icon: () => <PiStackDuotone />,
    label: model.name,
    to: `/content/${model.prefix}`,
  })) as NavEntry[],
  vars: vars.map((group) => ({
    icon: () => <PiGearDuotone />,
    label: group.name,
    to: `/settings/${group.prefix}`,
  })) as NavEntry[],
});
