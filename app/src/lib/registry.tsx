import type {
  AdminPluginConfig,
  NavEntry,
  PluginRoute,
} from "@njinlabs/njin-admin/sdk";
import { getSchema } from "@njinlabs/njin-admin/sdk";
import { PiFiles, PiGear, PiLayout } from "react-icons/pi";
import { client } from "./client";

export const navs = {
  main: [
    {
      icon: () => <PiLayout />,
      label: "Dashboard",
      to: "/",
    },
  ] as NavEntry[],
  models: [] as NavEntry[],
  plugins: [] as NavEntry[],
  vars: [] as NavEntry[],
};

// The pages of the admin, in the order the router gets them: its own first, then the plugins'.
export const routes = {
  main: [{ path: "/", component: () => <p>Dashboard</p> }] as PluginRoute[],
  plugins: [] as PluginRoute[],
};

const addStylesheet = (href: string) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
};

export const loadPlugins = async () => {
  const response = await fetch("/api/admin/manifest");

  // njin core does not serve the manifest yet. Until it does the endpoint is missing (or the dev
  // server answers with the page itself), and there are simply no plugins.
  if (!response.ok || !response.headers.get("content-type")?.includes("json"))
    return;

  const { plugins } = await response.json();

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
export const loadSchema = async () => {
  const { models, vars } = await getSchema(client);

  navs.models.push(
    ...models.map((model) => ({
      icon: () => <PiFiles />,
      label: model.name,
      to: `/content/${model.prefix}`,
    })),
  );
  navs.vars.push(
    ...vars.map((group) => ({
      icon: () => <PiGear />,
      label: group.name,
      to: `/settings/${group.prefix}`,
    })),
  );
};
