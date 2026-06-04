"use client";

import * as React from "react";
import { PatientDocumentUpload, type PatientDocument } from "@/components/patient-context/patient-document-upload";

interface Props {
  patientId: number;
}

export function PatientDocumentsTab({ patientId }: Props) {
  const [documents, setDocuments] = React.useState<PatientDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch existing documents on mount
  React.useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch(`/api/patient-360/documents?patientId=${patientId}`);
        if (res.ok) {
          const data = await res.json();
          setDocuments(
            (data.documents || []).map((d: Record<string, unknown>) => ({
              ...d,
              status: "ready" as const,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [patientId]);

  const handleDocumentUploaded = (doc: PatientDocument) => {
    setDocuments((prev) => {
      // If document already exists (by fileName), update it
      const existing = prev.findIndex((d) => d.fileName === doc.fileName && d.status === "uploading");
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = doc;
        return updated;
      }
      return [doc, ...prev];
    });
  };

  const handleDocumentRemoved = async (docId: number) => {
    try {
      await fetch(`/api/patient-360/documents?id=${docId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("Failed to remove document:", err);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">رفع المستندات الطبية</h2>
        <p className="text-sm text-gray-600">
          ارفع تحاليل، أشعة، روشتات، تقارير طبية، أو أي مستند. سيتم تحليله تلقائياً بالذكاء الطبي
          واستخراج البيانات المهمة وإضافتها لملف المريض.
        </p>
      </div>

      <PatientDocumentUpload
        patientId={patientId}
        documents={documents}
        onDocumentUploaded={handleDocumentUploaded}
        onDocumentRemoved={handleDocumentRemoved}
      />
    </div>
  );
}
