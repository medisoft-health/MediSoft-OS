import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getPrescriptionById } from "@/lib/queries/prescriptions";
import { formatClinicalDate, formatPatientId, calculateAge } from "@/lib/utils";
import { isRtlLocale, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Print Prescription ${id.slice(0, 8)}` };
}

export default async function PrescriptionPrintPage({ params }: PageProps) {
  const { id, locale: rawLocale } = await params;
  if (!UUID_RE.test(id)) notFound();

  const row = await getPrescriptionById(id);
  if (!row) notFound();
  const { prescription: rx, patient, physician } = row;

  const t = await getTranslations("PharmaX");
  const locale = (rawLocale ?? (await getLocale())) as Locale;
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const isRtl = dir === "rtl";

  const patientAge = calculateAge(patient.dateOfBirth);
  const today = formatClinicalDate(new Date());

  return (
    <div dir={dir} className="prescription-print-root">
      {/* Inline print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .prescription-print-root { padding: 0; }
            }
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
            .prescription-print-root {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
              color: #1a1a1a;
              line-height: 1.5;
            }
          `,
        }}
      />

      {/* Print button — hidden in print */}
      <div className="no-print" style={{ textAlign: isRtl ? "left" : "right", marginBottom: 16 }}>
        <button
          onClick={undefined}
          type="button"
          style={{
            padding: "8px 24px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
          data-print-btn
        >
          {t("printPrescription")}
        </button>
        {/* Client-side print trigger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.querySelector('[data-print-btn]')?.addEventListener('click',()=>window.print())`,
          }}
        />
      </div>

      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "2px solid #1a1a1a",
          paddingBottom: 12,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            MediSoft C-OS
          </h1>
          <p style={{ fontSize: 11, color: "#666", margin: "2px 0 0" }}>
            {isRtl ? "العيادة" : "Clinic Name"}
          </p>
        </div>
        <div style={{ textAlign: isRtl ? "left" : "right" }}>
          <div style={{ fontSize: 11, color: "#666" }}>{today}</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {t("prescriptionLabel")}
          </div>
        </div>
      </header>

      {/* ── Patient Info ── */}
      <section
        style={{
          background: "#f8f8f8",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 24px",
          fontSize: 13,
        }}
      >
        <div>
          <strong>{isRtl ? "الاسم" : "Name"}:</strong>{" "}
          {patient.firstName} {patient.lastName}
        </div>
        <div>
          <strong>{isRtl ? "رقم الملف الطبي" : "MRN"}:</strong>{" "}
          {formatPatientId(patient.id)}
        </div>
        <div>
          <strong>{isRtl ? "العمر" : "Age"}:</strong>{" "}
          {patientAge} {isRtl ? "سنة" : "years"}
        </div>
        <div>
          <strong>{isRtl ? "الجنس" : "Sex"}:</strong>{" "}
          {patient.sex === "male"
            ? isRtl
              ? "ذكر"
              : "Male"
            : patient.sex === "female"
              ? isRtl
                ? "أنثى"
                : "Female"
              : patient.sex}
        </div>
      </section>

      {/* ── Medications Table ── */}
      <section style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
            borderBottom: "1px solid #ddd",
            paddingBottom: 4,
          }}
        >
          {isRtl ? "الأدوية" : "Medications"}
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f0f0f0",
                textAlign: isRtl ? "right" : "left",
              }}
            >
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #ccc" }}>
                {isRtl ? "الدواء" : "Drug"}
              </th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #ccc" }}>
                {isRtl ? "الجرعة" : "Dose"}
              </th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #ccc" }}>
                {isRtl ? "التكرار" : "Frequency"}
              </th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #ccc" }}>
                {isRtl ? "الطريقة" : "Route"}
              </th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #ccc" }}>
                {isRtl ? "المدة" : "Duration"}
              </th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #ccc" }}>
                {isRtl ? "التعليمات" : "Instructions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Single-drug row from the prescription */}
            <tr>
              <td
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                  fontWeight: 600,
                }}
              >
                {rx.drugName}
                {rx.brandName ? (
                  <span style={{ fontWeight: 400, color: "#666" }}>
                    {" "}
                    ({rx.brandName})
                  </span>
                ) : null}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {rx.dose}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {rx.frequency}
              </td>
              <td
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                  textTransform: "capitalize",
                }}
              >
                {rx.route}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {rx.duration || "—"}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {rx.instructions || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Doctor Info + Signature ── */}
      <section
        style={{
          marginTop: 40,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          fontSize: 13,
        }}
      >
        <div>
          <div style={{ marginBottom: 4 }}>
            <strong>{t("preparedBy")}:</strong>{" "}
            {physician?.name ?? (isRtl ? "طبيب غير معروف" : "Unknown physician")}
          </div>
          {physician?.specialty && (
            <div style={{ color: "#666", fontSize: 12 }}>
              {physician.specialty}
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            <strong>{t("licenseNo")}:</strong> ____________
          </div>
        </div>
        <div style={{ textAlign: isRtl ? "left" : "right" }}>
          <div
            style={{
              marginTop: 32,
              borderTop: "1px solid #1a1a1a",
              paddingTop: 6,
              display: "inline-block",
              minWidth: 200,
              textAlign: "center",
            }}
          >
            {t("physicianSignature")}
          </div>
        </div>
      </section>

      {/* ── Footer Disclaimer ── */}
      <footer
        style={{
          marginTop: 48,
          paddingTop: 12,
          borderTop: "1px dashed #ccc",
          textAlign: "center",
          fontSize: 10,
          color: "#999",
        }}
      >
        {t("printDisclaimer")}
      </footer>
    </div>
  );
}
