"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Money } from "@/components/money";
import { useCardsStore } from "./_lib/store";
import { CardFace } from "./_components/card-face";
import { CreditSummary } from "./_components/credit-summary";
import { IssueCardDialog } from "./_components/issue-card-dialog";

const STATUS_LABEL: Record<string, string> = { active: "Active", frozen: "Frozen", lost: "Lost", canceled: "Canceled" };

export default function CardsPage() {
  const { state } = useCardsStore();
  return (
    <div>
      <PageHeader
        title="Cards"
        description="Spend, limits and controls for every card on the account."
        actions={<IssueCardDialog />}
      />
      <div className="mb-8">
        <CreditSummary />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {state.cards.map((card) => (
          <Link
            key={card.id}
            href={`/cards/${card.id}`}
            className="group rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CardFace card={card} />
            <div className="mt-2.5 flex items-center justify-between px-0.5">
              <span className="text-sm font-medium group-hover:underline">{card.nickname}</span>
              <span className="text-xs text-muted-foreground">{STATUS_LABEL[card.status]}</span>
            </div>
            <p className="px-0.5 text-xs text-muted-foreground">
              <Money amount={card.spentThisMonth} whole /> spent this month ·{" "}
              <Money amount={card.controls.monthlyLimit} whole /> limit
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
