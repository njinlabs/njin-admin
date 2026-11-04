import { describe, expect, test } from "bun:test";
import {
  addableWidgets,
  moveKey,
  orderedKeys,
  shownWidgets,
} from "../../src/lib/dashboard";

const available = [{ key: "a:one" }, { key: "a:two" }, { key: "b:three" }];

describe("dashboard layout", () => {
  test("starts empty: nothing is shown until it is added", () => {
    expect(shownWidgets([], available)).toEqual([]);
    expect(addableWidgets([], available).map((w) => w.key)).toEqual([
      "a:one",
      "a:two",
      "b:three",
    ]);
  });

  test("shows what was chosen in the saved order", () => {
    const keys = ["b:three", "a:one"];

    expect(shownWidgets(keys, available).map((w) => w.key)).toEqual(keys);
    expect(addableWidgets(keys, available).map((w) => w.key)).toEqual([
      "a:two",
    ]);
  });

  test("a saved key that is not available is skipped but kept when editing", () => {
    const keys = ["gone:x", "a:one"];

    expect(shownWidgets(keys, available).map((w) => w.key)).toEqual(["a:one"]);
    expect(orderedKeys(keys, available)).toEqual(["a:one", "gone:x"]);
  });

  test("moveKey moves one key and leaves the list alone for a no-op", () => {
    const keys = ["a", "b", "c"];

    expect(moveKey(keys, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveKey(keys, 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveKey(keys, 1, 1)).toBe(keys);
  });
});
