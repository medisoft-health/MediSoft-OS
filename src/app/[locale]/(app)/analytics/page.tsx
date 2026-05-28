import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "./_components/analytics-dashboard";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "Analytics | MediSoft C-OS" };

export default async function AnalyticsPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحليلات</h1>
        <p className="mt-1 text-sm text-gray-600">نظرة شاملة على بيانات العيادة والمرضى</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
