import type { FC } from "react";
import { can, type Permissions } from "./api";
import type { Form } from "./schema";

// What the signed-in user must be allowed to do for something to show: any level of `action` on
// `resource`. Resources are the server's catalog (models, "vars.<prefix>", "file", "user",
// "access_group", "analytics", and the `permissions` a server plugin adds), so a plugin names a
// resource its own server side declared.
export type Requires = { resource: string; action: string };

export type NavEntry = {
  icon: FC;
  label: string;
  to: string;
  requires?: Requires;
  // Lower first; entries with the same order (or none) keep the order they were registered in.
  order?: number;
};

// A page the plugin adds. The admin wraps it in a route, so inside the component use the hooks
// of @tanstack/react-router (useParams, Link, useNavigate) as in any page of the admin.
export type PluginRoute = {
  // Relative to the admin, e.g. "/reports" or "/reports/$id".
  path: string;
  component: FC;
  // Without it the page says there is no access instead of showing the component, by URL too.
  requires?: Requires;
};

// A tile of the dashboard.
export type Widget = {
  // Unique within the plugin.
  id: string;
  title?: string;
  // Columns it takes of the dashboard's grid: 1, 2, 3, or all of them.
  size?: "sm" | "md" | "lg" | "full";
  order?: number;
  requires?: Requires;
  component: FC;
};

// What the admin hands a plugin's field renderer. The renderer draws the input only; the label,
// the error and the place in the form are the admin's.
export type FieldProps = {
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  disabled?: boolean;
  invalid: boolean;
  // The field as the schema describes it (label, base type, options...).
  field: Omit<Form, "key">;
  // What the server wrote after the name: `plugin(text(), ["reports:slugify", options])`.
  options: unknown;
  // Everything in the form right now, to follow another field. A field with a value per language
  // is already the value of `locale`, not the map of languages.
  values: Record<string, unknown>;
  // The language being edited, when the model has languages. `value` is that language's too.
  locale?: string;
};

export type AdminPluginConfig = {
  // Namespaces what the plugin adds: a renderer `slugify` is used by the server as
  // "<name>:slugify". Same as the name given to the server plugin's `admin`.
  name: string;
  navs?: NavEntry[];
  routes?: PluginRoute[];
  widgets?: Widget[];
  // Renderers by name (without the plugin's name).
  fields?: Record<string, FC<FieldProps>>;
};

export const defineAdminPlugin = (config: AdminPluginConfig) => config;

type Gated = { requires?: Requires; order?: number };

// What the user may see out of `items`, in order. One rule for menu entries, widgets and pages.
export const visible = <T extends Gated>(
  items: readonly T[],
  permissions: Permissions,
): T[] =>
  items
    .filter(
      ({ requires }) =>
        !requires || can(permissions, requires.resource, requires.action),
    )
    // Array#sort is stable, so equal orders keep the order of registration.
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export * from "./api";
export * from "./schema";
export * from "./session";
