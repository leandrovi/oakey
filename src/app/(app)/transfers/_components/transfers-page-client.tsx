"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { useBank } from "@/components/bank/provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BankWire } from "@/lib/ledger/project";
import type { Recipient, Wire } from "@/lib/domain/types";
import { cancelWireAction, deleteRecipientAction, saveRecipientAction } from "@/server/actions";
import { CancelWireDialog } from "./cancel-wire-dialog";
import { MoveMoneyDialog } from "./move-money-dialog";
import { RecipientsPanel } from "./recipients-panel";
import { WireDetailSheet } from "./wire-detail-sheet";
import { WireRow } from "./wire-row";
import { IN_FLIGHT_STATUSES } from "../_lib/status";

function byNewest(a: BankWire, b: BankWire) {
  return b.createdAt.localeCompare(a.createdAt);
}

export function TransfersPageClient() {
  const router = useRouter();
  const { wires, recipients } = useBank();
  const [detailWireId, setDetailWireId] = useState<BankWire["id"] | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BankWire | null>(null);

  const recipientFor = (wire: BankWire) => recipients.find((r) => r.id === wire.recipientId);
  const inFlight = wires.filter((w) => IN_FLIGHT_STATUSES.includes(w.status)).sort(byNewest);
  const history = wires.filter((w) => !IN_FLIGHT_STATUSES.includes(w.status)).sort(byNewest);
  const detailWire = wires.find((w) => w.id === detailWireId) ?? null;

  function requestCancel(wire: Wire) {
    setCancelTarget(wires.find((item) => item.id === wire.id) ?? null);
  }

  async function confirmCancel(wire: Wire) {
    const result = await cancelWireAction({ idempotencyKey: crypto.randomUUID(), wireId: wire.id });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setCancelTarget(null);
    setDetailWireId(null);
    router.refresh();
  }

  async function addRecipient(recipient: Recipient) {
    const result = await saveRecipientAction({
      id: recipient.id,
      name: recipient.name,
      addressLine1: recipient.address.line1,
      addressLine2: recipient.address.line2,
      city: recipient.address.city,
      state: recipient.address.state,
      postalCode: recipient.address.postalCode,
      bankName: recipient.bankName,
      routingNumber: recipient.routingNumber,
      accountNumber: recipient.accountNumber,
      confirmAccountNumber: recipient.accountNumber,
    });
    if (!result.ok) toast.error(result.message);
    else router.refresh();
  }

  async function removeRecipient(id: string) {
    const result = await deleteRecipientAction({ id });
    if (!result.ok) toast.error(result.message);
    else router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Transfers"
        description="Wires in flight, transfer history and saved recipients."
        actions={
          <>
            <MoveMoneyDialog />
            <Button asChild>
              <Link href="/transfers/wire">
                <Send className="size-4" data-icon="inline-start" aria-hidden />
                Send a wire
              </Link>
            </Button>
          </>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">In flight</h2>
        {inFlight.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No wires are in flight right now.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {inFlight.map((wire) => (
              <WireRow key={wire.id} wire={wire} recipient={recipientFor(wire)} onOpen={(w) => setDetailWireId(w.id)} onRequestCancel={requestCancel} />
            ))}
          </div>
        )}
      </section>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="recipients">Saved recipients</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="pt-4">
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No past wires yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((wire) => (
                <WireRow key={wire.id} wire={wire} recipient={recipientFor(wire)} onOpen={(w) => setDetailWireId(w.id)} onRequestCancel={requestCancel} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="recipients" className="pt-4">
          <RecipientsPanel
            recipients={recipients}
            onAdd={addRecipient}
            onDelete={removeRecipient}
          />
        </TabsContent>
      </Tabs>

      <WireDetailSheet
        wire={detailWire}
        recipient={detailWire ? recipientFor(detailWire) : undefined}
        onOpenChange={(open) => !open && setDetailWireId(null)}
        onRequestCancel={requestCancel}
      />

      <CancelWireDialog
        wire={cancelTarget}
        recipient={cancelTarget ? recipientFor(cancelTarget) : undefined}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </>
  );
}
