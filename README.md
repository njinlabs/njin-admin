# njin-admin

The admin panel for njin, built so a site can add its own pages and menus as plugins.

| Folder | What it is |
| --- | --- |
| `app/` | The admin itself (Vite + React). It loads plugins at runtime. |
| `packages/` | `@njinlabs/njin-admin`: what a plugin imports (`/sdk`), the Vite preset that builds one (`/vite`), the shared-module list (`/shared`), the component kit (`/ui`) and the CSS tokens (`/theme.css`, `/plugin.css`). |

## Setup

```bash
bun install
```

## Develop

```bash
bun run dev   # http://localhost:5173/_admin/
```

`/api`, `/img` and `/uploads` are forwarded to the njin server (`VITE_API_URL`, default
`http://localhost:3000`).

Plugins are listed by the njin server at `GET /api/admin/manifest` (not built in core yet). Until it is, the admin
starts with no plugins.

### Playground (optional, local)

`playground/` is gitignored, as in njin core: a scratch place for example plugins. It is not a workspace; it
has its own `package.json` and installs the library with a link:

```bash
(cd packages && bun link)                                        # once
cd playground/reports && bun install                             # depends on "@njinlabs/njin-admin": "link:@njinlabs/njin-admin"
bun run build
```

## Check

```bash
bun test            # unit and feature tests
bun run typecheck   # every workspace
bun run lint        # biome (lint:fix and format to apply)
```

## How a plugin works

A plugin is one file that default-exports `defineAdminPlugin({ name, navs, routes, widgets, fields })`. It is built to a
single ES module without React, TanStack Query or TanStack Router: the admin hands its own copies to
the plugin at runtime, so there is one React for the whole page. Styles are built to a separate CSS
file that reads the admin's design tokens as CSS variables instead of copying them.

What it can add:

- `navs`: menu entries (section "Plugins"), with `order` and `requires`.
- `routes`: pages, with `requires`.
- `widgets`: tiles a user can add to their dashboard (`id`, `title`, `size`, `order`, `requires`). The dashboard starts
  empty; each user picks from the widgets they may see (the admin's own and the plugins'), so a widget is listed
  only to people who pass its `requires`.
- `fields`: input renderers for fields the server tagged with `plugin(text(), ["<name>:<renderer>", options])`.
  `fields: { slugify: ({ value, onChange, options, values, locale }) => ... }` is used for `"reports:slugify"`. With
  languages, `locale` is the one being edited and `value` and `values` are already that language's text, not the map.

### Contract version

The build writes `contract.json` (`{ "version": 1 }`) beside `index.js`; the manifest entry carries it as `contract`.
The admin loads only a plugin built for its own contract and logs why it skipped any other (a plugin that declares
none is skipped too). The version goes up on a breaking change to the sdk, the kit or the shared modules, and a new
major of React, react-dom, TanStack Query or Router counts as one.

A plugin can raise a toast from anywhere with `toast.success/error/info(title, description?)` from `@njinlabs/njin-admin/ui`;
the admin mounts the one `Toaster`.

`requires: { resource, action }` names a resource of the server's access catalog (models, `vars.<prefix>`,
`file`, `user`, `access_group`, `analytics`, and the `permissions` the server plugin declares). Inside a
plugin, `useSession`, `useClient`, `useCan` and `useCanOn` from the sdk read who is signed in and what they may do.
The plugin is registered on the server with `definePlugin({ admin: [import.meta.resolve("./admin/index.tsx")], permissions: [...] })`.
