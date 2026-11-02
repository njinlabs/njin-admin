# njin-admin

The admin panel for njin, built so a site can add its own pages and menus as plugins.

| Folder | What it is |
| --- | --- |
| `app/` | The admin itself (Vite + React). It loads plugins at runtime. |
| `packages/` | `@njinlabs/njin-admin`: what a plugin imports (`/sdk`), the Vite preset that builds one (`/vite`), the shared-module list (`/shared`) and the CSS tokens (`/theme.css`, `/plugin.css`). |

## Setup

```bash
bun install
```

## Develop

```bash
bun run dev   # http://localhost:5173/_admin/
```

`/api` and `/uploads` are forwarded to the njin server (`VITE_API_URL`, default
`http://localhost:3000`).

Plugins are listed by the njin server at `GET /api/admin/manifest` (not built in core yet). Until it is, the admin
starts with no plugins.

## Check

```bash
bun test            # unit and feature tests
bun run typecheck   # every workspace
bun run lint        # biome (lint:fix and format to apply)
```

## How a plugin works

A plugin is one file that default-exports `defineAdminPlugin({ navs, routes })`. It is built to a
single ES module without React, TanStack Query or TanStack Router: the admin hands its own copies to
the plugin at runtime, so there is one React for the whole page. Styles are built to a separate CSS
file that reads the admin's design tokens as CSS variables instead of copying them.
