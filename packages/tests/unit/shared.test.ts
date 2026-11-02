import { afterEach, describe, expect, test } from "bun:test";
import { exposeShared, SHARED_GLOBAL } from "../../src/shared";

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[SHARED_GLOBAL];
});

describe("exposeShared", () => {
  test("puts the modules where built plugins read them from", () => {
    const modules = {
      react: { name: "react" },
      "react/jsx-runtime": {},
      "react-dom": {},
      "@tanstack/react-query": {},
      "@tanstack/react-router": {},
      "@njinlabs/njin-admin/sdk": {},
    };

    exposeShared(modules);

    expect((globalThis as Record<string, unknown>)[SHARED_GLOBAL]).toBe(
      modules,
    );
  });
});
