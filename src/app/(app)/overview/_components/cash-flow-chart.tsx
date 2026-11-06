"use client";

import { useMemo, useState } from "react";
import { CompactBreakdown } from "@/components/ui/compact-breakdown";
import { KpiChart } from "@/components/ui/kpi-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents } from "@/lib/domain/money";
import type { Cents } from "@/lib/domain/types";
import type { MonthlyFlow } from "../_lib/metrics";

const WINDOWS = [
  { id: "3", label: "3M" },
  { id: "6", label: "6M" },
  { id: "12", label: "12M" },
] as const;

type WindowId = (typeof WINDOWS)[number]["id"];

function dollars(cents: number) {
  return cents / 100;
}

function formatDollars(amount: number) {
  return formatCents(Math.round(amount * 100) as Cents, { whole: true });
}

function windowRows(flow: MonthlyFlow[], size: number) {
  return flow.slice(Math.max(0, flow.length - size));
}

function priorRows(flow: MonthlyFlow[], size: number) {
  return flow.slice(Math.max(0, flow.length - size * 2), Math.max(0, flow.length - size));
}

function volume(rows: MonthlyFlow[]) {
  return rows.reduce((sum, row) => sum + row.in + row.out, 0);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function CashFlowChart({ flow }: { flow: MonthlyFlow[] }) {
  const [windowSize, setWindowSize] = useState<WindowId>("12");
  const size = Number(windowSize);
  const data = useMemo(() => windowRows(flow, size), [flow, size]);
  const net = data.reduce((sum, row) => sum + row.net, 0);
  const priorNet = priorRows(flow, size).reduce((sum, row) => sum + row.net, 0);

  return (
    <div className="space-y-3">
      <Tabs value={windowSize} onValueChange={(value) => setWindowSize(value as WindowId)}>
        <TabsList>
          {WINDOWS.map((window) => (
            <TabsTrigger key={window.id} value={window.id}>{window.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <KpiChart
        title="Cash flow"
        value={formatCents(net as Cents, { whole: true, signed: true })}
        delta={percentChange(net, priorNet)}
        labels={data.map((row) => row.label)}
        series={[
          { label: "Money in", color: "var(--color-chart-1)", values: data.map((row) => dollars(row.in)) },
          { label: "Money out", color: "var(--color-chart-4)", values: data.map((row) => dollars(row.out)) },
        ]}
        format={formatDollars}
      />
    </div>
  );
}

export function CashSplit({ flow }: { flow: MonthlyFlow[] }) {
  const [period, setPeriod] = useState<WindowId>("12");
  const size = Number(period);
  const rows = useMemo(() => windowRows(flow, size), [flow, size]);
  const moneyIn = rows.reduce((sum, row) => sum + row.in, 0);
  const moneyOut = rows.reduce((sum, row) => sum + row.out, 0);
  const delta = percentChange(volume(rows), volume(priorRows(flow, size)));

  return (
    <CompactBreakdown
      title="In and out"
      items={[
        { id: "in", label: "Money in", value: dollars(moneyIn), color: "var(--color-chart-1)" },
        { id: "out", label: "Money out", value: dollars(moneyOut), color: "var(--color-chart-4)" },
      ]}
      periods={WINDOWS.map((window) => ({ id: window.id, label: window.label }))}
      period={period}
      onPeriodChange={(id) => setPeriod(id as WindowId)}
      delta={delta}
      format={formatDollars}
      totalLabel="Moved"
    />
  );
}
