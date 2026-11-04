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

// What a plugin is built against. `version` goes up on any breaking change to what a plugin
// imports from the sdk or the kit, or to what the admin provides; the admin refuses a plugin built
// for another one. `shared` is the major of each package the admin shares: a plugin is built
// without them, so a new major of any of them is a new contract too. A test keeps `shared` equal
// to the peer dependencies, so changing a major cannot go unnoticed.
export const contract = {
  version: 1,
  shared: {
    react: 19,
    "react-dom": 19,
    "@tanstack/react-query": 5,
    "@tanstack/react-router": 1,
  },
};

// What the build writes beside a plugin (contract.json), for whatever fills the manifest.
export type PluginContract = { version: number };

// Why the admin will not load a plugin built for `declared`, or null when it can. A plugin that
// declares nothing is refused too: it cannot be told apart from one built for an older admin.
export const contractProblem = (
  name: string,
  declared: number | undefined,
): string | null => {
  if (declared === undefined) {
    return `Plugin "${name}" does not say which contract it was built for. Rebuild it with a current @njinlabs/njin-admin.`;
  }

  if (declared === contract.version) return null;

  const rebuild =
    declared < contract.version
      ? "Rebuild it with a current @njinlabs/njin-admin."
      : "Update the admin.";

  return `Plugin "${name}" was built for contract ${declared}; this admin provides ${contract.version}. ${rebuild}`;
};

// Where the admin puts the shared modules for plugins to read.
export const SHARED_GLOBAL = "__njin";

// Called once by the admin, before any plugin is loaded. Typed as a full record so adding a
// module to sharedModules fails to compile until the admin provides it too.
export const exposeShared = (modules: Record<SharedModule, unknown>): void => {
  (globalThis as Record<string, unknown>)[SHARED_GLOBAL] = modules;
};
