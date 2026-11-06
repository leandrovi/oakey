import { ArrowLeftRight, CreditCard, Gauge, Landmark, LayoutDashboard, ReceiptText, Settings } from "lucide-react";

export const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/credit", label: "Credit score", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
