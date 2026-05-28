import Link from "next/link";
import { ArrowLeft, KeyRound, Monitor, Settings, User } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { requireSession } from "@/lib/auth-helpers";
import { getUserById } from "@/lib/queries/user";
import { redirect } from "next/navigation";

import { ProfileTab } from "./_components/profile-tab";
import { SecurityTab } from "./_components/security-tab";
import { SessionsTab } from "./_components/sessions-tab";
import { PreferencesTab } from "./_components/preferences-tab";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
          Manage your profile, security, sessions, and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="profile">
            <User className="size-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound className="size-3.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Monitor className="size-3.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="size-3.5" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab userId={user.id} />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
