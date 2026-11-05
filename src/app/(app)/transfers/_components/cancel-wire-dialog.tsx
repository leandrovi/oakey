"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Money } from "@/components/money";
import type { Recipient, Wire } from "@/lib/domain/types";

export function CancelWireDialog({
  wire,
  recipient,
  onOpenChange,
  onConfirm,
}: {
  wire: Wire | null;
  recipient: Recipient | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (wire: Wire) => void;
}) {
  return (
    <AlertDialog open={wire !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {wire && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this wire?</AlertDialogTitle>
              <AlertDialogDescription>
                The <Money amount={wire.amount} /> wire to {recipient?.name ?? "this recipient"} will not be sent. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep wire</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onConfirm(wire);
                  toast.success("Wire canceled");
                }}
              >
                Cancel wire
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
