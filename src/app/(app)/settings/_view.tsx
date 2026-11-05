"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppearanceTab } from "./_components/appearance-tab";
import { NotificationsTab } from "./_components/notifications-tab";
import { ProfileTab } from "./_components/profile-tab";
import { SecurityTab } from "./_components/security-tab";

export function SettingsView() {
  const router = useRouter();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, security and preferences."
        actions={
          <Button variant="outline" onClick={() => router.push("/sign-in")}>
            <LogOut className="size-4" /> Sign out
          </Button>
        }
      />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
