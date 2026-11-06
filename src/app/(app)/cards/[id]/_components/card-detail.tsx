"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/shell/page-header";
import { useCardsStore } from "../../_lib/store";
import { CardFace } from "../../_components/card-face";
import { CardControls } from "./card-controls";
import { CardTransactions } from "./card-transactions";
import { ReportLostDialog } from "./report-lost-dialog";
import { CancelCardDialog } from "./cancel-card-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  frozen: "secondary",
  lost: "destructive",
  canceled: "outline",
};

export function CardDetail({ id }: { id: string }) {
  const { getCard } = useCardsStore();
  const card = getCard(id);

  if (!card) {
    return (
      <div>
        <PageHeader title="Card not found" description="This card may have been removed." />
        <Link href="/cards" className="text-sm text-primary hover:underline">
          Back to cards
        </Link>
      </div>
    );
  }

  const pct = card.controls.monthlyLimit > 0
    ? Math.min(100, Math.round((card.spentThisMonth / card.controls.monthlyLimit) * 100))
    : 0;

  return (
    <div>
      <Link href="/cards" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        All cards
      </Link>
      <PageHeader
        title={card.nickname}
        description={`${card.cardholder} · •••• ${card.last4}`}
        actions={<Badge variant={STATUS_VARIANT[card.status]} className="capitalize">{card.status}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <CardFace card={card} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Spent this month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl tabular">
                <Money amount={card.spentThisMonth} whole />
                <span className="text-base font-normal text-muted-foreground"> of <Money amount={card.controls.monthlyLimit} whole /></span>
              </p>
              <Progress value={pct} className="mt-3" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <CardControls card={card} />
          <CardTransactions card={card} />
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <ReportLostDialog card={card} />
              <CancelCardDialog card={card} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
