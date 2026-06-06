"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  Pill,
  MapPin,
  Truck,
  Shield,
  AlertTriangle,
  DollarSign,
  Clock,
  Star,
  Phone,
  Search,
  Brain,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmartPharmacyResult {
  prescriptionId: number;
  patientName: string;
  medications: Array<{
    medication: string;
    genericName: string;
    genericNameEn: string;
    strength: string;
    form: string;
    formEn: string;
    pharmacies: Array<{
      pharmacy: {
        id: string;
        name: string;
        nameEn: string;
        address: string;
        addressEn: string;
        phone: string;
        distance: number;
        rating: number;
        isOpen: boolean;
        openHours: string;
        hasDelivery: boolean;
      };
      available: boolean;
      price: number;
      currency: string;
      insuranceCovered: boolean;
      copayAmount?: number;
      hasAlternative: boolean;
      alternativeName?: string;
      alternativePrice?: number;
    }>;
    cheapestOption: { pharmacyName: string; price: number; currency: string } | null;
    nearestAvailable: { pharmacyName: string; distance: number } | null;
  }>;
  interactions: Array<{
    severity: string;
    drug1: string;
    drug2: string;
    description: string;
    descriptionEn: string;
    recommendation: string;
    recommendationEn: string;
  }>;
  insuranceCoverage: {
    provider: string;
    totalCopay: number;
    totalSavings: number;
    currency: string;
  } | null;
  totalEstimatedCost: number;
  currency: string;
  bestPharmacyRecommendation: string;
  bestPharmacyRecommendationEn: string;
  deliveryOptions: Array<{
    pharmacy: string;
    pharmacyEn: string;
    estimatedTime: string;
    estimatedTimeEn: string;
    cost: number;
    freeAbove: number;
  }>;
  aiSummary: string;
  aiSummaryEn: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartPharmacyPanel({ prescriptionId }: { prescriptionId?: number }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [result, setResult] = useState<SmartPharmacyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputId, setInputId] = useState(prescriptionId?.toString() || "");

  const searchPharmacy = useCallback(async () => {
    const id = inputId || prescriptionId?.toString();
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/smart-pharmacy?prescriptionId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [inputId, prescriptionId]);

  if (!result) {
    return (
      <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900">
            <Pill className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-teal-900 dark:text-teal-100">
              {isAr ? "شبكة الصيدليات الذكية" : "Smart Pharmacy Network"}
            </h3>
            <p className="text-sm text-teal-700 dark:text-teal-300">
              {isAr
                ? "ابحث عن أقرب صيدلية بأفضل سعر مع التوصيل"
                : "Find nearest pharmacy with best price and delivery"}
            </p>
          </div>
        </div>

        {!prescriptionId && (
          <div className="mb-4">
            <input
              type="number"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder={isAr ? "رقم الوصفة الطبية" : "Prescription ID"}
              className="w-full px-4 py-2 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        )}

        <button
          onClick={searchPharmacy}
          disabled={loading || (!inputId && !prescriptionId)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium hover:from-teal-600 hover:to-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Search className="h-4 w-4 animate-spin" />
              {isAr ? "جارٍ البحث..." : "Searching..."}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {isAr ? "ابحث في الصيدليات" : "Search Pharmacies"}
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Summary Header */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-5 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-teal-200" />
          <span className="text-sm font-medium text-teal-200">
            {isAr ? "ملخص ذكي" : "Smart Summary"}
          </span>
        </div>
        <p className="text-sm leading-relaxed opacity-95">
          {isAr ? result.aiSummary : result.aiSummaryEn}
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{result.totalEstimatedCost}</p>
            <p className="text-xs opacity-70">{isAr ? "ريال (تقديري)" : "SAR (est.)"}</p>
          </div>
          {result.insuranceCoverage && (
            <div className="text-center">
              <p className="text-2xl font-bold text-green-200">-{result.insuranceCoverage.totalSavings}</p>
              <p className="text-xs opacity-70">{isAr ? "توفير التأمين" : "Insurance savings"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Drug Interactions */}
      {result.interactions.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">
              {isAr ? "تفاعلات دوائية" : "Drug Interactions"}
            </h4>
          </div>
          {result.interactions.map((interaction, i) => (
            <div key={i} className="p-2 rounded-lg bg-white dark:bg-gray-800 mt-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{interaction.drug1}</span> ↔ <span className="font-medium">{interaction.drug2}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {isAr ? interaction.recommendation : interaction.recommendationEn}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Medications Availability */}
      {result.medications.map((med, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{med.medication}</h4>
              <p className="text-xs text-gray-500">{med.strength} • {isAr ? med.form : med.formEn}</p>
            </div>
            {med.cheapestOption && (
              <div className="text-end">
                <p className="text-lg font-bold text-teal-600">{med.cheapestOption.price} {med.cheapestOption.currency}</p>
                <p className="text-[10px] text-gray-500">{isAr ? "أفضل سعر" : "Best price"}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {med.pharmacies.slice(0, 3).map((ph, j) => (
              <div key={j} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  {ph.available ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{isAr ? ph.pharmacy.name : ph.pharmacy.nameEn}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {ph.pharmacy.distance} km
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 text-amber-400" /> {ph.pharmacy.rating}
                      </span>
                      {ph.pharmacy.isOpen && (
                        <span className="text-green-500">{isAr ? "مفتوح" : "Open"}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-end">
                  {ph.available ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ph.price} {ph.currency}</p>
                  ) : (
                    <p className="text-xs text-red-500">{isAr ? "غير متوفر" : "Unavailable"}</p>
                  )}
                  {ph.insuranceCovered && (
                    <p className="text-[10px] text-green-600">
                      <Shield className="inline h-2.5 w-2.5" /> {isAr ? "مغطى" : "Covered"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delivery Options */}
      {result.deliveryOptions.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-indigo-600" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isAr ? "خيارات التوصيل" : "Delivery Options"}
            </h4>
          </div>
          <div className="space-y-2">
            {result.deliveryOptions.map((opt, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{isAr ? opt.pharmacy : opt.pharmacyEn}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {isAr ? opt.estimatedTime : opt.estimatedTimeEn}
                  </p>
                </div>
                <div className="text-end">
                  {opt.cost === 0 ? (
                    <span className="text-xs font-medium text-green-600">{isAr ? "مجاني" : "Free"}</span>
                  ) : (
                    <span className="text-sm font-medium">{opt.cost} SAR</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
