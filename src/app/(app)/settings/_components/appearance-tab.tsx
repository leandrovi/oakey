"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Match your system, or pick one and stick with it.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors hover:bg-muted",
                  active ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground",
                )}
              >
                {active && <Check className="absolute top-2 right-2 size-3.5 text-primary" />}
                <Icon className="size-5" />
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
