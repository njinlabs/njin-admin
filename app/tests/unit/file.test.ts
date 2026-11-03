import { expect, test } from "bun:test";
import {
  absoluteUrl,
  acceptAttribute,
  formatBytes,
  isAbsoluteUrl,
  matchesAccept,
  matchesKind,
} from "../../src/lib/file";

test("formatBytes picks the unit", () => {
  expect(formatBytes(0)).toBe("0 B");
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1536)).toBe("1.5 KB");
  expect(formatBytes(5 * 1024 ** 2)).toBe("5.0 MB");
});

test("a path on the site becomes absolute, a full URL stays as it is", () => {
  expect(absoluteUrl("/uploads/a.png", "https://site.test")).toBe(
    "https://site.test/uploads/a.png",
  );
  expect(absoluteUrl("https://cdn.test/a.png", "https://site.test")).toBe(
    "https://cdn.test/a.png",
  );
  expect(isAbsoluteUrl("https://cdn.test/a.png")).toBe(true);
  expect(isAbsoluteUrl("/uploads/a.png")).toBe(false);
});

test("matchesKind groups mime types", () => {
  expect(matchesKind("image/png", "image")).toBe(true);
  expect(matchesKind("image/png", "other")).toBe(false);
  expect(matchesKind("application/pdf", "other")).toBe(true);
  expect(matchesKind("video/mp4", "video")).toBe(true);
  expect(matchesKind("application/pdf", "all")).toBe(true);
});

test("accept limits what a picker shows and uploads", () => {
  expect(matchesAccept("image/png", ["image"])).toBe(true);
  expect(matchesAccept("video/mp4", ["image"])).toBe(false);
  expect(matchesAccept("video/mp4", ["image", "video"])).toBe(true);
  expect(matchesAccept("video/mp4")).toBe(true);
  expect(acceptAttribute(["image", "video"])).toBe("image/*,video/*");
  expect(acceptAttribute(["image", "other"])).toBeUndefined();
  expect(acceptAttribute()).toBeUndefined();
});
