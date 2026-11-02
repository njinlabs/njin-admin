# njin-admin

The admin panel for njin (the framework at `D:/private/njin`). Its point: a site can add its own pages and
menus as plugins, without forking the admin. `PLAN.md` has what is done and what is left; `README.md` has the
layout and how to run it.

## Layout

- `app/`: the admin (Vite 8, React 19, TanStack Router and Query, Tailwind v4). Loads plugins at runtime.
- `packages/`: `@njinlabs/njin-admin`, one library with subpath exports:
  - `./sdk`: what a plugin imports (`defineAdminPlugin`, the typed API in `sdk/api`, the `/api/schema` parser in `sdk/schema`).
  - `./shared`: `sharedModules` and `exposeShared`.
  - `./vite`: `adminPluginConfig`, the preset that builds a plugin.
  - `./theme.css`, `./plugin.css`: design tokens and a plugin's Tailwind entry (files live in `src/ui/`).
- `playground/` and `app/public/mock/`: local only and gitignored, like `playground/` in njin core. They are a
  scratch place for example plugins and the mock manifest. Nothing in the repo may depend on them.
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

Run all three of test, typecheck and lint before calling work done. Vite configs that import workspace
TypeScript must run under Bun (`bunx --bun vite build`): Node cannot resolve extensionless TS imports.

## How plugins work (do not break these)

- A plugin is one file that default-exports `defineAdminPlugin({ navs, routes })`. It is built to a single ES
  module; `styles` (a separate CSS file) are listed in the manifest next to `entry`.
- React, `react/jsx-runtime`, `react-dom`, `@tanstack/react-query`, `@tanstack/react-router` and the sdk are **not**
  bundled into a plugin. The admin puts its own copies on `globalThis.__njin` (`exposeShared`) before loading any
  plugin, and the build rewrites those imports into reads from it. One React for the page, or hooks break.
- `exposeShared` takes `Record<SharedModule, unknown>`: adding to `sharedModules` fails to compile until `app/src/main.tsx`
  provides it. Add the new module's types/peer dependency too.
- A plugin is always built in production mode with the production JSX runtime (the admin only shares that one).
- Plugin CSS reads the admin's tokens as `var(--color-*)`; it does not copy them. `theme.css` uses `@theme static`
  on purpose: without it Tailwind only writes the tokens the admin's own pages use. Token names are a contract with
  plugins, so do not rename them casually.
- The manifest is a mock for now: `app/public/mock/manifest.json`, local and untracked, served by a dev-only
  middleware in `app/vite.config.ts`. Without it the admin simply has no plugins. The real one comes from njin core
  (`GET /api/admin/manifest`), not built yet.

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

## Talking to the njin server

- Server shapes live in `D:/private/njin` (`src/modules/api.ts`, `src/modules/vars.ts`, `src/core/admin_schema.ts`).
  Read them there rather than guessing; the models are dynamic, so response types are generic (`Row`, `Page<T>`) and
  narrowed per model.
- `GET /api/schema` returns `{ models, vars, i18n }`. `tests/fixtures/post-schema.json` is real output of
  `toAdminSchema`, kept as the parser's test data.
- Query keys nest by model so one `invalidateQueries({ queryKey: ["model", prefix] })` covers lists and records.

## Do not

- Touch auth or OAuth. A colleague is rewriting it in njin core and it is not pushed yet. The admin has no login,
  token or session code on purpose; `/api/schema` is refused (401) in dev until it lands.
- Change njin core from here without being asked. Core changes (the manifest endpoint, serving plugin files,
  building local plugins) are tracked in `PLAN.md` and wait on the auth work.
- Commit, push or change git config unless asked. `core.autocrlf` is `false` for this repo on purpose.
- Add UI kit components or commit to a visual style yet: the visual direction is undecided, and the values in
  `theme.css` are placeholders.
