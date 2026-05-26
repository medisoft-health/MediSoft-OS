import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { DiagnosisPageClient } from "./_components/diagnosis-page-client";

export const metadata = {
  title: "Differential Diagnosis | MediSoft C-OS",
};

export default async function DiagnosisPage() {
  const session = await requireSession();
  if (!session.ok) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">التشخيص التفريقي</h1>
        <p className="mt-1 text-sm text-gray-600">
          أدخل أعراض المريض للحصول على تحليل تشخيصي مدعوم بالذكاء الاصطناعي
        </p>
      </div>
      <DiagnosisPageClient />
    </div>
  );
}
