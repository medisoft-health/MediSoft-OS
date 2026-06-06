"use client";

import { ZeroClickInsights } from "@/components/clinical/zero-click-insights";

export function ZeroClickWrapper({ patientId }: { patientId: number }) {
  return <ZeroClickInsights patientId={patientId} />;
}
