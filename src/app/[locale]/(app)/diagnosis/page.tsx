import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DiagnosisPageClient } from "./_components/diagnosis-page-client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "Differential Diagnosis | MediSoft C-OS",
};

export default async function DiagnosisPage() {
  const [session, t] = await Promise.all([
    requireSession(),
    getTranslations("DiagnosisPage"),
  ]);
  if (!session.ok) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("description")}
        </p>
      </div>
      <DiagnosisPageClient />
    </div>
  );
}
