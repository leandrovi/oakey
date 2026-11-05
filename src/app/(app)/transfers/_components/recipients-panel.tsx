"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Recipient } from "@/lib/domain/types";
import { AddRecipientDialog } from "./add-recipient-dialog";

export function RecipientsPanel({
  recipients,
  onAdd,
  onDelete,
}: {
  recipients: Recipient[];
  onAdd: (recipient: Recipient) => void;
  onDelete: (id: Recipient["id"]) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddRecipientDialog onAdd={onAdd} />
      </div>

      {recipients.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No saved recipients yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recipients.map((recipient) => (
            <Card key={recipient.id} className="rounded-xl border-border/80 shadow-none">
              <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{recipient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {recipient.bankName} · ••{recipient.accountNumber.slice(-4)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${recipient.name}`}
                  onClick={() => setDeleteTarget(recipient)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to add their details again to send a wire to this recipient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep recipient</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                onDelete(deleteTarget.id);
                toast.success(`${deleteTarget.name} removed`);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
