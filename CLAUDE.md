# njin-admin

The admin panel for [njin](https://github.com/njinlabs/njin) ("core" below). A site adds its own pages, menus, dashboard
widgets and form inputs as plugins, without forking the admin. `README.md` is a short introduction; the documentation, including writing a plugin, is the separate docs site (njin.run/docs).

## Layout

- `app/`: the admin (Vite 8, React 19, TanStack Router and Query, Tailwind v4). Core serves its build at `/_admin`.
  - `src/lib/`: `client.ts` (the one axios instance), `registry.tsx` (menus, routes, widgets, plugin and schema loading),
    `create-router.tsx` (`createAdminRouter`), `session.ts` (who is signed in).
  - `src/components/`: the shell (sidebar), `Protected` (session guard), `Root` (first-run redirect), lists, dialogs.
  - `src/pages/`: login, setup, authorize, connections, dashboard, content list and form, settings, files, users.
  - `src/widgets/`: the dashboard's own tiles.
- `packages/`: `@njinlabs/njin-admin`, one library, subpath exports:
  - `./sdk`: what a plugin imports. `defineAdminPlugin`, session hooks (`useSession`, `useClient`, `useCan`, `useCanOn`),
    `sdk/api` (typed calls and query/mutation options per area), `sdk/schema` (JSON schema to form and zod).
  - `./ui`: the component kit on Base UI, one file per component, exported from `index.ts`.
  - `./shared`: the modules the admin shares with plugins and the `contract` version.
  - `./vite`: `adminPluginConfig`, the preset that builds a plugin.
  - `./theme.css`, `./plugin.css`: design tokens and a plugin's Tailwind entry.
- Tests: `packages/tests/{unit,feature,fixtures}` and `app/tests/unit`. Never next to the source.
- `playground/`, `app/public/mock/` and `app/vite.config.local.ts` are gitignored scratch space. Nothing tracked may
  depend on them.

## Commands

```bash
bun install
bun run dev          # http://localhost:5173/_admin/, forwards /api, /img, /uploads to VITE_API_URL (default :3000)
bun test             # whole repo
bun run typecheck    # every workspace
bun run lint         # biome check; lint:fix / format to apply
```

Test, typecheck and lint must pass; CI also builds the admin (`bunx --bun vite build` in `app/`: Node cannot resolve the
extensionless TypeScript imports of the workspace, so Vite configs run under Bun).

## Plugin contract (do not break it)

- A plugin is one file that default-exports `defineAdminPlugin({ name, navs, routes, widgets, fields })`, built to one ES
  module plus a stylesheet. Core lists it in `GET /api/admin/manifest`; `loadPlugins` loads what the manifest names.
- React, `react/jsx-runtime`, `react-dom`, TanStack Query and Router, the sdk and the kit are **not** bundled into a
  plugin. The admin puts its copies on `globalThis.__njin` (`exposeShared`) before loading any plugin, and the build
  rewrites those imports into reads from it. One React for the page, or hooks break; the kit is shared because Base UI
  has context and portals. Never give a plugin its own copy of the sdk.
- `sharedModules` and `exposeShared` are tied: a new shared module does not compile until `app/src/main.tsx` provides it.
- `contract` (`packages/src/shared.ts`) is the version a plugin is built for, written to `contract.json` by the build. A
  breaking change to the sdk, the kit or the shared modules bumps `contract.version`; `loadPlugins` refuses a plugin
  built for another. `contract.shared` holds the majors of the shared packages and a test ties it to the peer dependencies.
- `requires: { resource, action }` on a nav, route or widget is checked with `can` through `visible()` (which also sorts
  by `order`); a route that asks for it is guarded by `createAdminRouter`. `resource` comes from core's access catalog,
  including the `permissions` a server plugin declares; the admin cannot invent one.
- Field renderers: core's `plugin(type, ["<plugin>:<renderer>", options])` tags a field and keeps its base type. The
  renderer draws the input only (`FieldProps`); label, error and place belong to `RenderForm`. An unknown renderer name
  falls back to the base type. Lists do not use renderers.
- A plugin is built in production mode with the production JSX runtime. Its stylesheet is
  `@import "@njinlabs/njin-admin/plugin.css";` plus `@source "./";`. `plugin.css` turns off Tailwind's source detection
  on purpose (it would scan the whole project and ship every class the site uses).
- Plugin CSS reads the admin's tokens as `var(--color-*)`. `theme.css` uses `@theme static` so every token is written.
  Token names are part of the contract: do not rename them casually.

## Talking to core

- Core's shapes live in its repo (`src/modules/api.ts`, `src/modules/vars.ts`, `src/core/model/admin_schema.ts`). Read them
  there instead of guessing. Models are dynamic, so response types are generic (`Row`, `Page<T>`) and narrowed per model.
- Query and mutation options are factories taking the axios client (and a `QueryClient` for mutations, which refresh their
  own keys on success). Keys nest by model: `["model", prefix]` covers its lists and records.
- Ids are strings and are never cut or rewritten. A failed request is read with `toApiError(error)`:
  `{ status, message, fields, details }`, `fields` keyed by the dotted path of the form field.
- `GET /api/schema` returns `{ models, vars, i18n }`, already limited to what the caller may use.
  `packages/tests/fixtures/*-schema.json` is real output of core's `toAdminSchema`.

## Auth and session

- The session is an HttpOnly cookie (`njin_session`, `SameSite=Strict`, `Path=/api`) set by core at login and setup. No
  script here holds the token: do not read it, do not put it in `localStorage`, do not send an `Authorization` header.
  `createClient` sends credentials and `X-Requested-With`, which core requires on anything that changes data.
- Who is signed in is the `check-token` query (`sessionQuery`, key `["token"]`); `null` means a 401, nobody. Login and
  setup store the user with `setQueryData(sessionKey, user)`. `Protected` shows a retry if the server is unreachable,
  sends nobody to `/login?redirect=<page>`, and renders the pages only once the user and `GET /api/auth/permissions` are in.
- Signing out and a 401 on any request but login, `check-token` and logout both end in `endSession` (`lib/session.ts`):
  everything cached per session is dropped (`clearSession` keeps only `setup-status` and `token`, so a new query key needs
  nothing extra) and the router sends the page to `/login`. Navigate with the router; never reload to change state.
- Permissions are worked out by core (wildcards, `own`/`all`, token scopes, `ref`). Use `can`, `canList`, `canOn`
  (`sdk/api/permissions.ts`) to show only what will work; do not parse grants in the admin. Core still decides (403, or 404
  for someone else's record). Every new page and button follows them.
- OAuth for apps (MCP clients) is the admin's: `/oauth/authorize` (no sidebar, `ProtectedBare`) and `/connections`.
  Both use the admin session and core's `/api/oauth/*` JSON endpoints; the authorize query string goes through untouched
  and core validates it. Core serves no sign-in or consent page of its own.

## One schema

The server's JSON schema becomes **one zod schema** (`z.fromJSONSchema`, then `transformSchema`) in
`packages/src/sdk/schema/`. `getSchema` returns `{ ...item, form, schema }` per model and settings group: `form` lists the
inputs to draw, `schema` gives the defaults and validates. Fields, defaults and validation all come from it. Never add a
second representation (a field list, a hand-written validator). A fix is fine when it is small, explained and tested
against the real schemas in `tests/fixtures`.

## Content and settings pages

- `RenderForm` (`packages/src/ui/render-form.tsx`) is the only glue from `model.form` to the kit and the only part of
  the kit that uses react-hook-form. The app supplies what only it can: `loadRelated`, `filePicker`, `imageSrc`.
- A relation or file is held in the form as the picked record and reduced to its id by the schema. The page validates and
  sends only fields that have an input (`hasInput`), so a field a newer core adds does not block a save.
- Localized fields arrive as `{ locale: value }`. The form edits one language at a time and always saves all of them in one
  request.
- Draftable models have one overall status. Publish saves first and sends every language live; Unpublish and Discard act
  on every language. Buttons follow the `publish` permission. Settings are one document per group with the same form.
- Loading looks like what is loading (`FormSkeleton`, `TableSkeleton`), never a single block.

## Dashboard

It starts empty. A widget is `{ key, id, title, size, requires, component }`; the admin's own are in
`app/src/widgets/index.ts`, plugins' come through `registerPlugin` with `key = "<plugin>:<id>"`. The user's layout is an
ordered list of keys in `localStorage` per user (`lib/dashboard.ts` is the only code that touches it); a key that is not
available now is skipped but kept. Size belongs to the widget. A widget draws content only: the tile (title, handle,
remove, error boundary) is the dashboard's, and the widget supplies a skeleton and a failure message.

## UI kit

- Built on Base UI (`@base-ui/react`) with `cva` for variants and `cn` for classes. No other UI library.
- Style with tokens only (`bg-primary`, `border`, `rounded-control`, `text-danger`), never a fixed colour, so dark mode and
  plugins follow. Reach for the kit's component and its variants before writing classes by hand.
- One file per component, flat and small API (`Select` takes `options`). The kit does not know react-hook-form: inputs are
  controlled, `FieldError` takes `errors={[fieldState.error]}`. No icon library inside the package: inline SVG.
- The admin's Tailwind must see the kit's classes (`@source` in `app/src/index.css`). Add each new component to the
  `/components` showcase page.
- Kit tests render to a string (`tests/unit/ui`); what needs a click is checked on the showcase page.

## Conventions

- Code and comments in English. Comments say why, not what, and match the density around them.
- Keep it simple: plain arrays and functions over registries, classes or abstractions.
- Types live next to where they are used, not in a shared `types.ts`. Split into small files when a file carries unrelated
  things; keep related things together.
- Name things after what the server calls them: `model`, `vars`, `schema`, `prefix`. Lists are plural.
- Forms use react-hook-form with a zod resolver and the kit's `Field`/`FieldError`, not hand-rolled state. Prefer a tested
  package to rewriting its logic.
- Formatting is Biome; do not hand-format. Keep `package.json` dependency lists alphabetical.
- Tests do not touch the network: API tests use an axios client with a fake adapter (`tests/unit/api/capture.ts`).
- Dynamic routes (plugins, models) are not type-checked since their paths exist only at runtime; built-in routes are.
- Do not add mock manifests or mock servers to the repo.
