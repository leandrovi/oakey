"use client";

import { format, parseISO } from "date-fns";
import { Money } from "@/components/money";
import { useBank } from "@/components/bank/provider";
import { AgentTree, type TreeAgent, type TreeAgentStatus } from "@/components/ui/agent-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { canCancelWire } from "@/lib/domain/wire";
import type { BankWire } from "@/lib/ledger/project";
import type { Cents, Recipient } from "@/lib/domain/types";
import { WIRE_STATUS_BADGE_CLASS, WIRE_STATUS_LABEL } from "../_lib/status";

function at(value: string | null | undefined) {
  return value ? new Date(value).getTime() : undefined;
}

function fedwireStatus(wire: BankWire): TreeAgentStatus {
  if (wire.status === "completed") return "done";
  if (wire.status === "failed") return "failed";
  if (wire.status === "canceled") return "stopped";
  if (wire.status === "processing") return "running";
  return "queued";
}

function wirePath(wire: BankWire): TreeAgent {
  const started = at(wire.createdAt);
  const rootStatus: TreeAgentStatus = wire.status === "completed" ? "done" : wire.status === "failed" ? "failed" : wire.status === "canceled" ? "stopped" : "running";
  return {
    id: wire.id,
    name: "Domestic wire",
    task: "Send a domestic wire",
    status: rootStatus,
    cost: 0,
    started,
    ended: at(wire.completedAt) ?? at(wire.failedAt),
    children: [
      {
        id: `${wire.id}-ledger`,
        name: "Ledger lock",
        task: "Hold the amount and the fee",
        status: wire.ledgerLockedAt ? "done" : "queued",
        cost: 0,
        started: at(wire.ledgerLockedAt) ?? started,
        ended: at(wire.ledgerLockedAt),
      },
      {
        id: `${wire.id}-aba`,
        name: "ABA check",
        task: "Check the routing number",
        status: wire.abaCheckedAt ? "done" : "queued",
        cost: 0,
        started: at(wire.abaCheckedAt) ?? started,
        ended: at(wire.abaCheckedAt),
      },
      {
        id: `${wire.id}-fedwire`,
        name: "Fedwire send",
        task: "Send the payment",
        status: fedwireStatus(wire),
        cost: wire.fee / 100,
        started: at(wire.fedwireSentAt) ?? started,
        ended: wire.status === "completed" ? at(wire.completedAt) : at(wire.failedAt),
      },
    ],
  };
}

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

export function WireDetailSheet({
  wire,
  recipient,
  onOpenChange,
  onRequestCancel,
}: {
  wire: BankWire | null;
  recipient: Recipient | undefined;
  onOpenChange: (open: boolean) => void;
  onRequestCancel: (wire: BankWire) => void;
}) {
  const { accounts } = useBank();
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
              <AgentTree root={wirePath(wire)} title="Wire path" />

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
