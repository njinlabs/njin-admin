import { analyticsQuery, useClient } from "@njinlabs/njin-admin/sdk";
import { Badge, Skeleton } from "@njinlabs/njin-admin/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PiMagnifyingGlassMinus, PiTrendDown, PiTrendUp } from "react-icons/pi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

// The server wants a full ISO datetime with an offset, never a bare date.
const iso = (date: Date) => {
  const offset = -date.getTimezoneOffset();
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const local = new Date(date.getTime() + offset * 60_000)
    .toISOString()
    .slice(0, 19);

  return `${local}${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
};

// The `days` days up to the end of today, and the same number of days right before them.
const periods = (days: number) => {
  const to = new Date();
  to.setHours(23, 59, 59, 0);
  const start = new Date(to);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const before = new Date(start.getTime() - 1000);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - days);

  return {
    current: { from: iso(start), to: iso(to) },
    previous: { from: iso(previousStart), to: iso(before) },
    start,
  };
};

const Failed = () => (
  <p className="text-sm text-muted-foreground">Could not load this.</p>
);

const NoData = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
    <PiMagnifyingGlassMinus className="size-6 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">No data</p>
  </div>
);

const Trend = ({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) => {
  if (!previous) return null;

  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;

  return (
    <Badge>
      {up ? <PiTrendUp /> : <PiTrendDown />}
      {up ? "+" : ""}
      {change.toFixed(1)}%
    </Badge>
  );
};

const DAYS = 30;

// One number of the summary against the period before it.
const Stat = ({ field }: { field: "totalPageviews" | "uniqueVisitors" }) => {
  const client = useClient();
  const { current, previous } = periods(DAYS);
  const now = useQuery(analyticsQuery(client, "summary", current));
  const before = useQuery(analyticsQuery(client, "summary", previous));

  if (now.isError) return <Failed />;
  if (now.isPending) return <Skeleton className="h-9 w-28" />;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-3xl font-semibold tabular-nums">
          {now.data[field].toLocaleString()}
        </p>
        {before.data && (
          <Trend current={now.data[field]} previous={before.data[field]} />
        )}
      </div>
      <p className="text-xs text-muted-foreground">Last {DAYS} days</p>
    </div>
  );
};

export const PageviewsWidget = () => <Stat field="totalPageviews" />;
export const VisitorsWidget = () => <Stat field="uniqueVisitors" />;

const ranges = [7, 30, 90] as const;

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

// The server leaves out days without a visit; a chart needs them as zeros.
const withGaps = (
  data: { date: string; count: number }[],
  start: Date,
  days: number,
) => {
  const counts = new Map(data.map(({ date, count }) => [date, count]));

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    const key = [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, "0"),
      String(day.getDate()).padStart(2, "0"),
    ].join("-");

    return { date: key, count: counts.get(key) ?? 0 };
  });
};

export const TrafficWidget = () => {
  const client = useClient();
  const [days, setDays] = useState<(typeof ranges)[number]>(30);
  const { current, start } = periods(days);
  const { data, isPending, isError } = useQuery(
    analyticsQuery(client, "timeseries", { ...current, interval: "day" }),
  );
  const points = withGaps(data ?? [], start, days);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Pageviews</p>
          <p className="text-xs text-muted-foreground">Last {days} days</p>
        </div>
        <div className="flex rounded-control border border-border bg-background p-0.5">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`rounded-[0.25rem] px-2.5 py-1 text-xs font-medium ${
                range === days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-subtle"
              }`}
            >
              {range} days
            </button>
          ))}
        </div>
      </div>
      {isError ? (
        <Failed />
      ) : isPending ? (
        <Skeleton className="h-[250px] w-full" />
      ) : points.every(({ count }) => count === 0) ? (
        <div className="h-[250px]">
          <NoData />
        </div>
      ) : (
        <div
          className="h-[250px] w-full"
          role="img"
          aria-label="Pageviews per day"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <defs>
                <linearGradient id="fillTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={shortDate}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-control border border-border bg-background px-3 py-2 text-xs shadow-md">
                      <p className="text-muted-foreground">
                        {shortDate(payload[0].payload.date)}
                      </p>
                      <p className="font-medium tabular-nums">
                        {Number(payload[0].value).toLocaleString()} pageviews
                      </p>
                    </div>
                  ) : null
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#fillTraffic)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

type Item = { label: string; count: number };

// A list of the most frequent values, each row filled in proportion to the largest.
const Breakdown = ({
  items,
  isPending,
  isError,
}: {
  items: Item[];
  isPending: boolean;
  isError: boolean;
}) => {
  if (isError) return <Failed />;
  if (isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <Skeleton key={row} className="h-7 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) return <NoData />;

  const max = Math.max(1, ...items.map(({ count }) => count));

  return (
    <ul className="space-y-1.5">
      {items.slice(0, 8).map(({ label, count }) => (
        <li
          key={label}
          className="relative flex items-center justify-between gap-3 overflow-hidden rounded-control px-2 py-1 text-sm"
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary/15"
            style={{ width: `${(count / max) * 100}%` }}
          />
          <span className="relative truncate">{label}</span>
          <span className="relative shrink-0 tabular-nums text-muted-foreground">
            {count.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const TopPagesWidget = () => {
  const client = useClient();
  const { data, isPending, isError } = useQuery(
    analyticsQuery(client, "by-page", periods(DAYS).current),
  );

  return (
    <Breakdown
      isPending={isPending}
      isError={isError}
      items={(data ?? []).map(({ path, count }) => ({ label: path, count }))}
    />
  );
};

export const ReferrersWidget = () => {
  const client = useClient();
  const { data, isPending, isError } = useQuery(
    analyticsQuery(client, "by-referrer", periods(DAYS).current),
  );

  return (
    <Breakdown
      isPending={isPending}
      isError={isError}
      items={(data ?? []).map(({ referrer, count }) => ({
        label: referrer ?? "Direct",
        count,
      }))}
    />
  );
};

export const CountriesWidget = () => {
  const client = useClient();
  const { data, isPending, isError } = useQuery(
    analyticsQuery(client, "by-country", periods(DAYS).current),
  );

  return (
    <Breakdown
      isPending={isPending}
      isError={isError}
      items={(data ?? []).map(({ country, count }) => ({
        label: country ?? "Unknown",
        count,
      }))}
    />
  );
};
