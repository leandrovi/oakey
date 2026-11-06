import type { WireStatus } from "@/lib/domain/types";

export const WIRE_STATUS_LABEL: Record<WireStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  canceled: "Canceled",
  failed: "Failed",
};

export const WIRE_STATUS_BADGE_CLASS: Record<WireStatus, string> = {
  pending: "border-warning/30 bg-warning/10 text-warning",
  processing: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-success/30 bg-success/10 text-success",
  canceled: "border-border bg-muted text-muted-foreground",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const IN_FLIGHT_STATUSES: readonly WireStatus[] = ["pending", "processing"];

export const WIRE_TIMELINE: readonly WireStatus[] = ["pending", "processing", "completed"];
