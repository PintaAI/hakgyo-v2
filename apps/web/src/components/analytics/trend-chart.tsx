"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer, type ChartConfig } from "~/components/ui/chart";
import {
  formatCompactRupiah,
  formatCount,
  formatPercent,
  formatRupiahAmount,
} from "~/lib/analytics/format";
import {
  formatBucketLabel,
  formatBucketTitle,
  type AnalyticsGranularity,
} from "~/lib/analytics/period";
import { cn } from "~/lib/utils";

export type TrendValueFormat = "count" | "rupiah" | "percent";

export type TrendSeries = {
  key: string;
  label: string;
  /** CSS color; defaults to the primary color. */
  color?: string;
};

type Row = { bucket: string } & Record<string, number | string | null>;

const formatters: Record<
  TrendValueFormat,
  { axis: (value: number) => string; value: (value: number) => string }
> = {
  count: { axis: formatCount, value: formatCount },
  rupiah: { axis: formatCompactRupiah, value: formatRupiahAmount },
  percent: { axis: formatPercent, value: formatPercent },
};

/**
 * One period's trend: an area for a single series, or stacked bars when the
 * series add up (such as enrollments by source).
 */
export function TrendChart({
  data,
  series,
  granularity,
  format,
  kind = "area",
  label,
  className,
}: {
  data: readonly Row[];
  series: readonly TrendSeries[];
  granularity: AnalyticsGranularity;
  format: TrendValueFormat;
  kind?: "area" | "bar";
  /** Accessible summary of what the chart shows. */
  label: string;
  className?: string;
}) {
  const config = Object.fromEntries(
    series.map((item, index) => [
      item.key,
      {
        label: item.label,
        color:
          item.color ??
          (index === 0 ? "var(--primary)" : `var(--chart-${index + 1})`),
      },
    ]),
  ) satisfies ChartConfig;
  const formatter = formatters[format];
  const axis = {
    tickLine: false,
    axisLine: false,
    tickMargin: 8,
  } as const;
  const tooltip = (
    <Tooltip
      cursor={kind === "bar" ? { fill: "var(--muted)" } : undefined}
      content={({ active, payload, label: bucket }) => {
        if (!active || !payload?.length || typeof bucket !== "string") {
          return null;
        }
        return (
          <div className="bg-background border-border min-w-40 rounded-lg border px-3 py-2 text-xs shadow-lg">
            <p className="mb-1.5 font-medium">
              {formatBucketTitle(bucket, granularity)}
            </p>
            <ul className="space-y-1">
              {payload.map((item) => {
                const key = String(item.dataKey);
                const value = item.value;
                return (
                  <li key={key} className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ background: `var(--color-${key})` }}
                    />
                    <span className="text-muted-foreground">
                      {config[key]?.label ?? key}
                    </span>
                    <span className="ml-auto pl-3 font-medium tabular-nums">
                      {typeof value === "number" ? formatter.value(value) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }}
    />
  );
  const xAxis = (
    <XAxis
      dataKey="bucket"
      {...axis}
      minTickGap={24}
      tickFormatter={(bucket: string) => formatBucketLabel(bucket, granularity)}
    />
  );
  const yAxis = (
    <YAxis
      {...axis}
      width={format === "rupiah" ? 64 : format === "percent" ? 44 : 36}
      allowDecimals={false}
      domain={format === "percent" ? [0, 1] : undefined}
      tickFormatter={formatter.axis}
    />
  );

  return (
    <figure aria-label={label} className={cn("min-w-0", className)}>
      <ChartContainer
        config={config}
        className="aspect-auto h-56 w-full sm:h-64"
      >
        {kind === "bar" ? (
          <BarChart data={[...data]} margin={{ left: 0, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            {tooltip}
            {series.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                stackId="total"
                fill={`var(--color-${item.key})`}
                radius={
                  index === series.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                }
                maxBarSize={36}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={[...data]} margin={{ left: 0, right: 4, top: 8 }}>
            <defs>
              {series.map((item) => (
                <linearGradient
                  key={item.key}
                  id={`fill-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${item.key})`}
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${item.key})`}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            {tooltip}
            {series.map((item) => (
              <Area
                key={item.key}
                dataKey={item.key}
                type="monotone"
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                fill={`url(#fill-${item.key})`}
                connectNulls
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        )}
      </ChartContainer>
      {series.length > 1 ? (
        <figcaption className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {series.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-[2px]"
                style={{ background: config[item.key]?.color }}
              />
              {item.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
