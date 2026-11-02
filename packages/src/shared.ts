// Modules the admin shares with every plugin. A plugin is built without them and reads them
// from the admin at runtime, so there is one React (hooks, context) for the whole page.
export const sharedModules = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "@tanstack/react-query",
  "@tanstack/react-router",
  "@njinlabs/njin-admin/sdk",
  "@njinlabs/njin-admin/ui",
] as const;

export type SharedModule = (typeof sharedModules)[number];

// Where the admin puts the shared modules for plugins to read.
export const SHARED_GLOBAL = "__njin";

// Called once by the admin, before any plugin is loaded. Typed as a full record so adding a
// module to sharedModules fails to compile until the admin provides it too.
export const exposeShared = (modules: Record<SharedModule, unknown>): void => {
  (globalThis as Record<string, unknown>)[SHARED_GLOBAL] = modules;
};
