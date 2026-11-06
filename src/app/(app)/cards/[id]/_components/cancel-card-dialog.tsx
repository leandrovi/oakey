"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Card, CardCancelReason, CardId } from "@/lib/domain/types";
import { useCardsStore } from "../../_lib/store";

const REASONS: { value: CardCancelReason; label: string }[] = [
  { value: "no_longer_needed", label: "No longer needed" },
  { value: "compromised", label: "Card compromised" },
  { value: "lost", label: "Lost or stolen" },
  { value: "employee_left", label: "Employee left" },
  { value: "other", label: "Other" },
];

export function CancelCardDialog({ card }: { card: Card }) {
  const { dispatch } = useCardsStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CardCancelReason>("no_longer_needed");
  const [confirmLast4, setConfirmLast4] = useState("");
  const confirmId = useId();
  const canCancel = confirmLast4 === card.last4;

  function cancel() {
    if (!canCancel) return;
    dispatch({ type: "cancel", id: card.id as CardId, reason });
    toast.success(`${card.nickname} canceled`, { description: "This cannot be undone." });
    setOpen(false);
    setConfirmLast4("");
    router.push("/cards");
  }

  if (card.status === "canceled") return null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmLast4("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Cancel card</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {card.nickname}?</AlertDialogTitle>
          <AlertDialogDescription>
            This is irreversible. The card will stop working immediately and cannot be reactivated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as CardCancelReason)}>
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={confirmId}>
              Type the last 4 digits (<span className="tabular">{card.last4}</span>) to confirm
            </Label>
            <Input
              id={confirmId}
              value={confirmLast4}
              onChange={(e) => setConfirmLast4(e.target.value)}
              maxLength={4}
              inputMode="numeric"
              placeholder={card.last4}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep card</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canCancel}
            onClick={cancel}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Cancel card permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
