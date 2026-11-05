"use client";

import { format } from "date-fns";
import { CheckCircle2, CircleDashed, Download, Flag, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Money } from "@/components/money";
import { typeLabel } from "../_lib/options";
import type { Transaction } from "@/lib/domain/types";

const STATUS_STEPS = ["pending", "posted"] as const;

function StatusTimeline({ status }: { status: Transaction["status"] }) {
  if (status === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="size-4" />Failed
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {STATUS_STEPS.map((step, i) => {
        const reached = status === "posted" || step === "pending";
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <Separator className="w-6" />}
            <div className={`flex items-center gap-1.5 text-sm ${reached ? "text-foreground" : "text-muted-foreground"}`}>
              {step === "posted" && status !== "posted" ? <CircleDashed className="size-4" /> : <CheckCircle2 className="size-4 text-success" />}
              <span className="capitalize">{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TransactionDetailSheet({
  transaction,
  accountLabel,
  onOpenChange,
}: {
  transaction: Transaction | null;
  accountLabel: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={transaction != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        {transaction && (
          <>
            <SheetHeader>
              <SheetTitle>{transaction.description}</SheetTitle>
              <p className="text-sm text-muted-foreground">{transaction.counterparty}</p>
            </SheetHeader>
            <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
              <Money amount={transaction.amount} direction={transaction.direction} className="font-heading text-3xl font-medium" />
              <StatusTimeline status={transaction.status} />

              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-right">{format(new Date(transaction.postedAt), "MMM d, yyyy 'at' h:mm a")}</dd>
                <dt className="text-muted-foreground">Account</dt>
                <dd className="text-right">{accountLabel}</dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-right">{transaction.category}</dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-right">{typeLabel(transaction.type)}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right"><Badge variant={transaction.status === "failed" ? "destructive" : "outline"} className="capitalize">{transaction.status}</Badge></dd>
                <dt className="text-muted-foreground">Balance after</dt>
                <dd className="text-right">{transaction.balanceAfter != null ? <Money amount={transaction.balanceAfter} whole /> : "—"}</dd>
                <dt className="text-muted-foreground">Reference ID</dt>
                <dd className="truncate text-right font-mono text-xs">{transaction.id}</dd>
              </dl>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => toast("Receipt downloaded", { description: `${transaction.id}.pdf` })}>
                  <Download className="size-4" />Download receipt
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => toast("Problem reported", { description: "Our team will follow up by email." })}>
                  <Flag className="size-4" />Report a problem
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
