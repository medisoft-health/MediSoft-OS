import nextDynamic from "next/dynamic";
import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsDashboard = nextDynamic(
  () =>
    import("./_components/analytics-dashboard").then(
      (m) => m.AnalyticsDashboard,
    ),
  {
    loading: () => <Skeleton className="h-96 rounded-2xl" />,
    ssr: false,
  },
);

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "Analytics | MediSoft C-OS" };

export default async function AnalyticsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  const t = await getTranslations("Analytics");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
