import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Recipient, Wire } from "@/lib/domain/types";
import { WireRow } from "./wire-row";

const wire = {
  id: "wire_1",
  idempotencyKey: "key",
  fromAccountId: "acct",
  recipientId: "recip",
  amount: 10_000,
  fee: 1_500,
  memo: "",
  purpose: "Rent",
  status: "pending",
  createdAt: "2026-11-05T15:30:00.000Z",
  expectedSettlementDate: "2026-11-05",
} as Wire;

const recipient = { id: "recip", name: "Kestrel Realty" } as Recipient;

describe("WireRow", () => {
  it("looks clickable and keeps cancel off the open control", () => {
    const onOpen = vi.fn();
    const onRequestCancel = vi.fn();
    const { container } = render(<WireRow wire={wire} recipient={recipient} onOpen={onOpen} onRequestCancel={onRequestCancel} />);

    const row = container.firstElementChild;
    expect(row?.className).toContain("hover:bg-muted/50");
    expect(row?.className).toContain("border-border/80");

    const open = screen.getByRole("button", { name: /Kestrel Realty/ });
    expect(open.className).toContain("cursor-pointer");
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledWith(wire);

    fireEvent.click(screen.getByRole("button", { name: "Cancel wire" }));
    expect(onRequestCancel).toHaveBeenCalledWith(wire);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
