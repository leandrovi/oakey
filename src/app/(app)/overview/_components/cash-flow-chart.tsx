"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents } from "@/lib/domain/money";
import type { MonthlyFlow } from "../_lib/metrics";

const WINDOWS = [
  { value: "3", label: "3M" },
  { value: "6", label: "6M" },
  { value: "12", label: "12M" },
] as const;

const chartConfig: ChartConfig = {
  in: { label: "Money in", color: "var(--color-chart-1)" },
  out: { label: "Money out", color: "var(--color-chart-4)" },
};

export function CashFlowChart({ flow }: { flow: MonthlyFlow[] }) {
  const [windowSize, setWindowSize] = useState<"3" | "6" | "12">("12");
  const data = useMemo(() => flow.slice(flow.length - Number(windowSize)), [flow, windowSize]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap gap-3 items-center justify-between">
        <CardTitle>Cash flow</CardTitle>
        <Tabs value={windowSize} onValueChange={(v) => setWindowSize(v as typeof windowSize)}>
          <TabsList>
            {WINDOWS.map((w) => (
              <TabsTrigger key={w.value} value={w.value}>{w.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{name === "in" ? "Money in" : "Money out"}</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">{formatCents(value as never, { whole: true })}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="in" fill="var(--color-in)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="out" fill="var(--color-out)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
