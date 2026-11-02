import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { analyticsQuery, getAnalytics } from "../../../src/sdk/api";
import { capture } from "./capture";

test("getAnalytics reads the endpoint with the range", async () => {
  const { client, uri } = capture({
    data: { totalPageviews: 10, uniqueVisitors: 4 },
  });

  const summary = await getAnalytics(client, "summary", {
    from: "2026-01-01T00:00:00+07:00",
  });

  expect(summary.uniqueVisitors).toBe(4);
  expect(decodeURIComponent(uri())).toBe(
    "/api/analytics/summary?from=2026-01-01T00:00:00+07:00",
  );
});

test("timeseries takes an interval", async () => {
  const { client, uri } = capture({ data: [{ date: "2026-01-01", count: 3 }] });

  const rows = await getAnalytics(client, "timeseries", { interval: "hour" });

  expect(rows[0]?.count).toBe(3);
  expect(uri()).toBe("/api/analytics/timeseries?interval=hour");
});

test("analyticsQuery keys by endpoint and params", async () => {
  const { client } = capture({ data: [] });
  const options = analyticsQuery(client, "by-page", { from: "x" });

  expect([...options.queryKey]).toEqual([
    "analytics",
    "by-page",
    { from: "x" },
  ]);
  expect(await new QueryClient().fetchQuery(options)).toEqual([]);
});
