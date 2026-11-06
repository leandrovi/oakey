"use client";

import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Card, CardId } from "@/lib/domain/types";
import { useCardsStore } from "../../_lib/store";

export function ReportLostDialog({ card }: { card: Card }) {
  const { dispatch } = useCardsStore();

  function confirm() {
    dispatch({ type: "reportLost", id: card.id as CardId });
    toast.success("Card reported lost", { description: "It's blocked immediately. We can issue a free replacement." });
  }

  if (card.status === "lost") {
    return (
      <Button
        variant="outline"
        onClick={() => {
          toast.success("Replacement card ordered", { description: "A new physical card ships in 5-7 business days." });
        }}
      >
        Order replacement card
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={card.status !== "active" && card.status !== "frozen"}>
          Report lost or stolen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report {card.nickname} as lost or stolen?</AlertDialogTitle>
          <AlertDialogDescription>
            We&rsquo;ll block the card immediately so it can&rsquo;t be used again. You can order a free replacement right after.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Report card</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
