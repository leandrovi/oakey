"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { user } from "@/lib/mock/seed";
import { ChangeEmailDialog } from "./change-email-dialog";

export function ProfileTab() {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [businessName, setBusinessName] = useState(user.businessName);
  const [email, setEmail] = useState(user.email);
  const [dirty, setDirty] = useState(false);

  function save() {
    setDirty(false);
    toast.success("Profile saved");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>This is what shows up on invoices and statements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setDirty(true);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Used to sign in and for account notices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Current email</Label>
              <Input id="email" value={email} disabled className="w-64" />
            </div>
            <ChangeEmailDialog currentEmail={email} onChanged={setEmail} />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={!dirty} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
