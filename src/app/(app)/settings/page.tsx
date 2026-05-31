export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { ModulePlaceholder } from "@/components/module-placeholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      module="Settings"
      subtitle="System & User Preferences"
      description="User profile, clinic settings, role management, audit logs, and integrations with NPHIES, Sehaty, and lab information systems."
      phase={6}
      features={[
        "Profile & licence management",
        "Bilingual UI toggle (Arabic / English)",
        "Two-factor authentication",
        "Audit log viewer (admin only)",
        "Role management (physician / admin)",
        "API integrations (NPHIES, Sehaty, LIS)",
      ]}
      tech={["Better-Auth", "next-intl", "SDAIA audit trail"]}
    />
  );
}
