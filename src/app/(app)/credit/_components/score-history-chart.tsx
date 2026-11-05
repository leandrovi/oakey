"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { CreditScore } from "@/lib/domain/types";

const config: ChartConfig = { score: { label: "Score", color: "var(--color-chart-1)" } };

export function ScoreHistoryChart({ history }: { history: CreditScore["history"] }) {
  const data = history.map((h) => ({ month: format(new Date(h.month), "MMM"), score: h.score }));
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis domain={[300, 850]} ticks={[300, 580, 670, 740, 800, 850]} tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
        <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
