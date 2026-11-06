"use client";

import { format, parseISO } from "date-fns";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCancelWire } from "@/lib/domain/wire";
import type { Recipient, Wire } from "@/lib/domain/types";
import { WIRE_STATUS_BADGE_CLASS, WIRE_STATUS_LABEL } from "../_lib/status";

export function WireRow({
  wire,
  recipient,
  onOpen,
  onRequestCancel,
}: {
  wire: Wire;
  recipient: Recipient | undefined;
  onOpen: (wire: Wire) => void;
  onRequestCancel: (wire: Wire) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 px-4 py-3 transition-colors hover:border-border">
      <button type="button" onClick={() => onOpen(wire)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="min-w-0">
          <p className="truncate font-medium">{recipient?.name ?? "Recipient"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {format(parseISO(wire.createdAt), "MMM d, yyyy")} · {wire.purpose}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={WIRE_STATUS_BADGE_CLASS[wire.status]}>
          {WIRE_STATUS_LABEL[wire.status]}
        </Badge>
        <Money amount={wire.amount} className="w-24 shrink-0 text-right font-medium" />
        {canCancelWire(wire.status) && (
          <Button variant="outline" size="sm" onClick={() => onRequestCancel(wire)}>
            Cancel wire
          </Button>
        )}
      </div>
    </div>
  );
}
