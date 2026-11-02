import { queryOptions } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

// from and to are full ISO datetimes with an offset ("2026-01-01T00:00:00+07:00"); a date alone
// is refused. path narrows to one page.
type Range = { from?: string; to?: string; path?: string };

// Each endpoint, with what it takes and what it returns.
type Endpoints = {
  summary: {
    params: Range;
    data: { totalPageviews: number; uniqueVisitors: number };
  };
  "by-country": {
    params: Range;
    data: { country: string | null; count: number }[];
  };
  "by-referrer": {
    params: Range;
    data: { referrer: string | null; count: number }[];
  };
  "by-page": {
    params: Omit<Range, "path">;
    data: { path: string; count: number }[];
  };
  timeseries: {
    params: Range & { interval?: "day" | "hour" };
    data: { date: string; count: number }[];
  };
};

// GET /api/analytics/<endpoint>
export const getAnalytics = async <K extends keyof Endpoints>(
  client: AxiosInstance,
  endpoint: K,
  params?: Endpoints[K]["params"],
): Promise<Endpoints[K]["data"]> => {
  const { data } = await client.get<{ data: Endpoints[K]["data"] }>(
    `/api/analytics/${endpoint}`,
    { params },
  );

  return data.data;
};

export const analyticsQuery = <K extends keyof Endpoints>(
  client: AxiosInstance,
  endpoint: K,
  params?: Endpoints[K]["params"],
) =>
  queryOptions({
    queryKey: ["analytics", endpoint, params],
    queryFn: () => getAnalytics(client, endpoint, params),
  });
