# njin-admin

The admin panel for njin (the framework at `D:/private/njin`). Its point: a site can add its own pages and
menus as plugins, without forking the admin. The repo is public at github.com/njinlabs/njin-admin. `PLAN.md` has what
is done and what is left; `README.md` has the layout and how to run it.

## Layout

- `app/`: the admin (Vite 8, React 19, TanStack Router and Query, Tailwind v4). Loads plugins at runtime.
  `src/lib/` has the `client` (the one axios instance), the `registry` (menus, pages, plugin and schema loading) and
  `createAdminRouter`; `src/components/shell.tsx` is the layout with the sidebar.
- `packages/`: `@njinlabs/njin-admin`, one library with subpath exports:
  - `./sdk`: what a plugin imports. `defineAdminPlugin`; `sdk/api` (`index.ts` client, manifest and `toApiError`;
    `model.ts` records and their query and mutation options; `vars.ts` settings; `file.ts`, `analytics.ts`, `setup.ts`);
    `sdk/schema` (`schema.ts` is the JSON-schema-to-zod pipeline, `index.ts` is `getSchema`).
  - `./shared`: `sharedModules` and `exposeShared`.
  - `./vite`: `adminPluginConfig`, the preset that builds a plugin.
  - `./ui`: the component kit on Base UI (`src/ui/`, one file per component, `index.ts` exports them). Plugins import
    it for pages that look like the admin.
  - `./theme.css`, `./plugin.css`: design tokens and a plugin's Tailwind entry (files live in `src/ui/`).
- Local only and gitignored, as `playground/` is in njin core: `playground/` (example plugins), `app/public/mock/` and
  `app/vite.config.local.ts` (what stands in for the server while those are tried). Nothing tracked may depend on
  them or mention them as part of the project. `playground/` is not a workspace: each plugin in it has its own
  `package.json` and `bun.lock` and uses `"@njinlabs/njin-admin": "link:@njinlabs/njin-admin"` (run `bun link` in
  `packages/` once), as in core.
- Tests: `packages/tests/{unit,feature,fixtures}` and `app/tests/unit`. The plugin the feature tests build lives in
  `packages/tests/fixtures/plugin`.

## Commands

```bash
bun install
bun run dev          # http://localhost:5173/_admin/
bun test             # whole repo
bun run typecheck    # every workspace (native tsc, TypeScript 7)
bun run lint         # biome check; lint:fix / format to apply
```

Run all three of test, typecheck and lint before calling work done. CI (`.github/workflows/ci.yml`) runs the same on
every push and PR (`biome ci`, typecheck, tests, a build of the admin). Vite configs that import workspace
TypeScript must run under Bun (`bunx --bun vite build`): Node cannot resolve extensionless TS imports.

## How plugins work (do not break these)

- A plugin is one file that default-exports `defineAdminPlugin({ navs, routes })`. It is built to a single ES
  module; `styles` (a separate CSS file) are listed in the manifest next to `entry`.
- React, `react/jsx-runtime`, `react-dom`, `@tanstack/react-query`, `@tanstack/react-router`, the sdk and the ui kit are **not**
  bundled into a plugin. The admin puts its own copies on `globalThis.__njin` (`exposeShared`) before loading any
  plugin, and the build rewrites those imports into reads from it. One React for the page, or hooks break.
- `exposeShared` takes `Record<SharedModule, unknown>`: adding to `sharedModules` fails to compile until `app/src/main.tsx`
  provides it. Add the new module's types/peer dependency too. The kit is shared for the same reason as React: Base UI has context
  and portals, so a plugin must use the admin's copy.
- A plugin is always built in production mode with the production JSX runtime (the admin only shares that one).
- A plugin's stylesheet is `@import "@njinlabs/njin-admin/plugin.css";` plus `@source "./";` (the folder with its
  files). `plugin.css` turns off Tailwind's own source detection on purpose: left alone it scans the whole project it
  runs in, and the plugin's CSS would carry every class the site uses (41 kB instead of 1 kB in the playground).
- Plugin CSS reads the admin's tokens as `var(--color-*)`; it does not copy them. `theme.css` uses `@theme static`
  on purpose: without it Tailwind only writes the tokens the admin's own pages use. Token names are a contract with
  plugins, so do not rename them casually.
- The admin reads its plugins from `GET /api/admin/manifest`. njin core does not serve it yet; until then the
  loader finds nothing and the admin has no plugins. Do not add mock manifests or servers to the repo.

## Conventions

- Code and comments are in English. Comments say why, not what. Match the density of the surrounding code.
- Keep it simple. Plain arrays and functions over registries, classes or abstractions (the plugin list is just
  `navs.plugins.push(...)`, not a `registerPlugin`).
- Types live next to where they are used, not in a shared `types.ts`. A function and the types only it needs share
  a file. Split into small files in a folder when a file carries several unrelated things; group closely related
  things in one file when they belong together (`sdk/api/model.ts`, `shared.ts`).
- Name things after what the server calls them: `model`, `vars`, `schema`, `prefix`. Lists are plural (`navs`,
  `routes`, `models`).
- Tests are never next to the source: `tests/unit` for one function, `tests/feature` for a build or flow end to
  end. No network: the API tests use an axios client with a fake adapter (`tests/unit/api/capture.ts`).
- Formatting is Biome (`biome.json`, same as njin core). Do not hand-format.
- Dependency lists in `package.json` are kept alphabetical.
- Dynamic routes (plugins, models) are not type-checked, since their paths exist only at runtime. Built-in routes can be.
- Forms in the admin use react-hook-form with a zod resolver and the kit's `Field`/`FieldError` (see `app/src/pages/login.tsx`),
  not hand-rolled state. Prefer a tested package over writing the logic again.

## Talking to the njin server

- Server shapes live in `C:/dev-things/private/njin` (`src/modules/api.ts`, `src/modules/vars.ts`, `src/core/admin_schema.ts`).
  Read them there rather than guessing; the models are dynamic, so response types are generic (`Row`, `Page<T>`) and
  narrowed per model.
- `GET /api/schema` returns `{ models, vars, i18n }`. `tests/fixtures/post-schema.json` is real output of
  `toAdminSchema`, kept as the parser's test data.
- Query keys nest by model so one `invalidateQueries({ queryKey: ["model", prefix] })` covers lists and records. Query
  and mutation options are factories taking the axios client (and a `QueryClient` for mutations, which refresh their own
  model or group when they succeed).
- Ids are plain strings (a UUID v7 from the SQL adapters, a bare id from SurrealDB); never cut or rewrite them.
- A failed request is read with `toApiError(error)`: `{ status, message, fields }`, with `fields` keyed by the dotted
  path of the form field (422 validation errors and 409 unique violations).

## Auth

The server side is njin core's (`src/modules/auth.ts`, `setup.ts`): `POST /api/auth/login` returns a session token in
JSON, `GET /api/auth/check-token` validates it, `DELETE /api/auth/logout` ends it, `/api/setup` makes the first admin.
The admin side, in `app/src`:

- The token is the `token` cookie, written with `react-cookie` (`useCookies`, `CookiesProvider` in `main.tsx`), path
  `/`, 30 days. Always path `/`: a narrower one misses the page when the URL has no trailing slash. It is written by
  script, so it is not `HttpOnly`; that needs the server to set it (see `PLAN.md`, section 5).
- `components/protected.tsx` guards the pages: no cookie goes to `/login`; otherwise it calls `check-token`, sets the
  `Authorization` header on the client, loads the schema, and drops a token the server refuses. `components/root.tsx`
  sends every page to `/setup` until the first admin exists. Tests replace both through the `root` and `layout`
  options of `createAdminRouter`, since they ask the server.
- Pages before a session (login, setup) share `components/auth-layout.tsx` and `password-input.tsx`.
- Do not store the token in `localStorage`, and do not reload the page to move between login and the admin: navigate
  with the router.

## The schema

`packages/src/sdk/schema/schema.ts` is the old admin's `lib/schema.ts` (its owner's core code), checked by Biome like the
rest. The server's JSON schema becomes **one zod schema** (`z.fromJSONSchema`, then `transformSchema`), and the form, the
defaults and the validation all come from that one schema, 1:1 with the backend. `getSchema` returns, for each model and
settings group, `{ ...item, form, schema }`: `form` (from `toForm`) lists the inputs to draw, `schema` is what
`getDefaultValues` reads the defaults from and what validates the form. Never add a second representation (a
field list, a hand-written validator) next to it. Fixing it is fine, but keep the change small, explain it, and test it
against the server's real schemas (`tests/fixtures/*-schema.json`, made by `toAdminSchema` in njin core).

## The UI kit

`packages/src/ui/`, exported as `@njinlabs/njin-admin/ui`. Built on Base UI (`@base-ui/react`) with `cva` for variants and
`cn` (`clsx` + `tailwind-merge`) for classes.

- Styled with the tokens in `theme.css` only (`bg-primary`, `border`, `rounded-control`, `text-danger`), never a fixed
  colour, so dark mode and plugins follow. The primary scale is built around `#186049` (the 700 step); `primary` is 700
  in light mode and 400 in dark mode.
- One file per component, API kept flat and small (`Select` takes `options`, not compound parts). The kit knows nothing
  of react-hook-form: its inputs are controlled, and `FieldError` takes `errors={[fieldState.error]}` structurally.
  The glue from `Form` (the schema's field list) to the kit belongs in `RenderForm`.
- No icon library in the package: the few icons a component needs are inline SVG.
- The admin's Tailwind must see the kit's classes (`@source` in `app/src/index.css`: the package sits behind
  `node_modules`, where Tailwind does not look). A plugin's CSS does not carry the kit's classes, the admin's does.
- Tests render to a string (`tests/unit/ui`), like the router tests: no DOM. What needs a click is looked at on the
  showcase page, `/components` in the admin (`app/src/pages/components.tsx`): add each new component there.

## Do not

- Replace or drop a mechanism the old admin used (JSON schema to form and validation, the data table, richtext) without
  asking first: say what the old way was, what you would do instead, and what is lost. Keep a single schema as the
  source: fields, defaults and validation all derive from the server's JSON schema, never a second representation.
- Change auth or OAuth on the server. A colleague owns it in njin core; the admin only uses it (see "Auth").
- Change njin core from here without being asked. Core changes (the manifest endpoint, serving plugin files,
  building local plugins, an `HttpOnly` cookie) are tracked in `PLAN.md`.
- Commit, push or change git config unless asked. `core.autocrlf` is `false` for this repo on purpose.
- Add kit components that are not in the order in `PLAN.md` (section 4) without asking. Do not bring in a UI library
  other than Base UI for them, or give a component its own colours: tokens only.
