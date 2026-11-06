"use client";

import { format, parseISO } from "date-fns";
import { Check, CircleDashed, X } from "lucide-react";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { accounts } from "@/lib/mock/seed";
import { canCancelWire } from "@/lib/domain/wire";
import type { Cents, Recipient, Wire } from "@/lib/domain/types";
import { WIRE_STATUS_BADGE_CLASS, WIRE_STATUS_LABEL, WIRE_TIMELINE } from "../_lib/status";

function maskAccountNumber(accountNumber: string) {
  return `••••${accountNumber.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Timeline({ status }: { status: Wire["status"] }) {
  if (status === "canceled" || status === "failed") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <X className="size-4" aria-hidden />
        {status === "canceled" ? "This wire was canceled." : "This wire failed to send."}
      </div>
    );
  }
  const currentIndex = WIRE_TIMELINE.indexOf(status);
  return (
    <ol className="flex flex-col gap-0">
      {WIRE_TIMELINE.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={
                  done
                    ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : "flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground"
                }
              >
                {done ? <Check className="size-3" aria-hidden /> : <CircleDashed className="size-3" aria-hidden />}
              </span>
              {i < WIRE_TIMELINE.length - 1 && <span className={`h-6 w-px ${i < currentIndex ? "bg-primary" : "bg-border"}`} />}
            </div>
            <span className={`pb-6 text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>{WIRE_STATUS_LABEL[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function WireDetailSheet({
  wire,
  recipient,
  onOpenChange,
  onRequestCancel,
}: {
  wire: Wire | null;
  recipient: Recipient | undefined;
  onOpenChange: (open: boolean) => void;
  onRequestCancel: (wire: Wire) => void;
}) {
  const fromAccount = wire ? accounts.find((a) => a.id === wire.fromAccountId) : undefined;
  const total = wire ? ((wire.amount + wire.fee) as Cents) : undefined;

  return (
    <Sheet open={wire !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {wire && (
          <>
            <SheetHeader>
              <SheetTitle>Wire to {recipient?.name ?? "Recipient"}</SheetTitle>
              <SheetDescription>
                <Badge variant="outline" className={WIRE_STATUS_BADGE_CLASS[wire.status]}>
                  {WIRE_STATUS_LABEL[wire.status]}
                </Badge>
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-4">
              <Timeline status={wire.status} />

              <div>
                <p className="font-heading text-2xl font-medium tabular">
                  <Money amount={wire.amount} />
                </p>
                <p className="text-sm text-muted-foreground">Expected to settle {format(parseISO(wire.expectedSettlementDate), "MMM d, yyyy")}</p>
              </div>

              <Separator />

              <div className="flex flex-col">
                <Row label="Amount" value={<Money amount={wire.amount} />} />
                <Row label="Wire fee" value={<Money amount={wire.fee} />} />
                <Row label="Total debit" value={<Money amount={total ?? wire.amount} />} />
              </div>

              <Separator />

              <div className="flex flex-col">
                <Row label="From" value={fromAccount ? `${fromAccount.name} ••${fromAccount.mask}` : wire.fromAccountId} />
                <Row label="Recipient" value={recipient?.name ?? "—"} />
                <Row label="Bank" value={recipient?.bankName ?? "—"} />
                <Row label="Routing number" value={recipient?.routingNumber ?? "—"} />
                <Row label="Account number" value={recipient ? maskAccountNumber(recipient.accountNumber) : "—"} />
              </div>

              <Separator />

              <div className="flex flex-col">
                <Row label="Memo" value={wire.memo || "—"} />
                <Row label="Purpose" value={wire.purpose} />
                <Row label="Reference" value={<span className="font-mono text-xs">{wire.idempotencyKey}</span>} />
              </div>

              {canCancelWire(wire.status) && (
                <Button variant="destructive" onClick={() => onRequestCancel(wire)}>
                  Cancel wire
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
