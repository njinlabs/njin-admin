import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  overallStatus,
  StatusBadge,
  statusLabels,
} from "../../src/components/draft-status";

describe("overallStatus", () => {
  test("is the status of a record with one", () => {
    expect(overallStatus({ id: "1", status: "changed" })).toBe("changed");
  });

  test("is live only when every language is live, a draft only when none is", () => {
    const of = (status: Record<string, string>) =>
      overallStatus({ id: "1", status });

    expect(of({ id: "published", en: "published" })).toBe("published");
    expect(of({ id: "draft", en: "draft" })).toBe("draft");
    expect(of({ id: "published", en: "draft" })).toBe("changed");
    expect(of({ id: "published", en: "changed" })).toBe("changed");
  });

  test("is nothing for a record without a status", () => {
    expect(overallStatus({ id: "1" })).toBeNull();
    expect(overallStatus({ id: "1", status: {} })).toBeNull();
  });
});

describe("statusLabels", () => {
  test("names each status", () => {
    expect(statusLabels.draft).toBe("Draft");
    expect(statusLabels.published).toBe("Published");
    expect(statusLabels.changed).toBe("Has unpublished changes");
  });
});

describe("StatusBadge", () => {
  // The badge goes into the shell's slot beside the title, which a plain render has none of.
  test("draws nothing of its own", () => {
    expect(
      renderToString(<StatusBadge record={{ id: "1", status: "draft" }} />),
    ).toBe("");
  });
});
