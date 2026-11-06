import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { TransactionsView } from "./_components/transactions-view";

function TransactionsFallback() {
  return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
}

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Every payment, deposit and card swipe across your accounts." />
      <Suspense fallback={<TransactionsFallback />}>
        <TransactionsView />
      </Suspense>
    </div>
  );
}
