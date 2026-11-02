import { describe, expect, test } from "bun:test";
import { sharedModules } from "../../../src/shared";
import { readFromGlobal } from "../../../src/vite";

describe("readFromGlobal", () => {
  test("has an entry for every shared module", () => {
    expect(Object.keys(readFromGlobal()).sort()).toEqual(
      [...sharedModules].sort(),
    );
  });

  test("reads each module from the shared global, by name", () => {
    expect(readFromGlobal().react).toBe('globalThis.__njin["react"]');
    expect(readFromGlobal()["react/jsx-runtime"]).toBe(
      'globalThis.__njin["react/jsx-runtime"]',
    );
  });
});
