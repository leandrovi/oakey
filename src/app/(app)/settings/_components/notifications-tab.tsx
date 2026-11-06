"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Toggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const INITIAL_TOGGLES: Toggle[] = [
  { id: "transactions", label: "Transaction alerts", description: "A ping every time money moves in or out.", enabled: true },
  { id: "low-balance", label: "Low balance warnings", description: "When checking drops under $10,000.", enabled: true },
  { id: "weekly-summary", label: "Weekly summary", description: "Cash flow and spend, every Monday morning.", enabled: true },
  { id: "security", label: "Security alerts", description: "New sign-ins and password changes.", enabled: true },
  { id: "product", label: "Product updates", description: "New features and changes to Oakey.", enabled: false },
];

export function NotificationsTab() {
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);

  function toggle(id: string, enabled: boolean) {
    setToggles((xs) => xs.map((t) => (t.id === id ? { ...t, enabled } : t)));
    const target = toggles.find((t) => t.id === id);
    if (target) toast.success(`${target.label} ${enabled ? "on" : "off"}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose what Oakey emails and pushes to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {toggles.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-4 rounded-lg px-2 py-3">
            <Label htmlFor={`toggle-${t.id}`} className="flex-col items-start gap-0.5 font-normal">
              <span className="font-medium text-foreground">{t.label}</span>
              <span className="text-sm text-muted-foreground">{t.description}</span>
            </Label>
            <Switch id={`toggle-${t.id}`} checked={t.enabled} onCheckedChange={(enabled) => toggle(t.id, enabled)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
