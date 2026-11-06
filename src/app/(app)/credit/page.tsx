"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shell/page-header";
import { useBank } from "@/components/bank/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "./_components/score-gauge";
import { ScoreHistoryChart } from "./_components/score-history-chart";
import { FactorsList } from "./_components/factors-list";

export default function CreditPage() {
  const { creditScore } = useBank();
  return (
    <div>
      <PageHeader title="Credit score" description="Your business credit score, what drives it, and how it has moved." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-2">
              <ScoreGauge score={creditScore.score} />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Updated {format(new Date(creditScore.updatedAt), "MMMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-accent">
            <CardContent className="flex items-center justify-between gap-3 pt-4">
              <div>
                <p className="text-sm font-medium text-accent-foreground">Your score unlocks these offers</p>
                <p className="text-xs text-accent-foreground/70">See pre-approved loans based on this score.</p>
              </div>
              <Button asChild size="icon" variant="ghost" className="shrink-0">
                <Link href="/loans" aria-label="See loan offers">
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>12-month history</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreHistoryChart history={creditScore.history} />
            </CardContent>
          </Card>
          <FactorsList factors={creditScore.factors} />
        </div>
      </div>
    </div>
  );
}
