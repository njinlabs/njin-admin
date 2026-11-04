import tailwindcss from "@tailwindcss/vite";
import externalGlobals from "rollup-plugin-external-globals";
import type { UserConfig } from "vite";
import {
  contract,
  type PluginContract,
  SHARED_GLOBAL,
  type SharedModule,
  sharedModules,
} from "./shared";

type Options = {
  // The file that default-exports defineAdminPlugin(...).
  entry: string;
  // Where the built plugin goes (default "dist"). It is written as index.js.
  outDir?: string;
};

// module name -> the expression that reads it from the admin, for rollup-plugin-external-globals.
export const readFromGlobal = (): Record<SharedModule, string> =>
  Object.fromEntries(
    sharedModules.map((name) => [
      name,
      `globalThis.${SHARED_GLOBAL}["${name}"]`,
    ]),
  ) as Record<SharedModule, string>;

// Vite config that builds an admin plugin: one ES module (index.js), with the modules the admin
// shares left out and read from the admin at runtime instead. Styles the plugin imports come out
// beside it as index.css, built with Tailwind (see plugin.css).
export const adminPluginConfig = ({
  entry,
  outDir = "dist",
}: Options): UserConfig => ({
  // A plugin is always a production build: the admin shares only the production JSX runtime.
  mode: "production",
  oxc: { jsx: { runtime: "automatic", development: false } },
  // Library mode does not replace this, and some packages (react-icons) check it.
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    tailwindcss(),
    {
      // Says which contract this build is for; the manifest carries it to the admin.
      name: "njin-admin-contract",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "contract.json",
          source: JSON.stringify({
            version: contract.version,
          } satisfies PluginContract),
        });
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    lib: { entry, formats: ["es"], fileName: "index", cssFileName: "index" },
    rollupOptions: {
      external: [...sharedModules],
      plugins: [externalGlobals(readFromGlobal())],
    },
  },
});
