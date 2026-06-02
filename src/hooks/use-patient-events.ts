"use client";

import * as React from "react";
import { usePatientContext } from "@/components/patient-context";

/**
 * Event categories that map to the patient_event_category enum.
 */
export type EventCategory =
  | "clinical"
  | "medication"
  | "lab"
  | "imaging"
  | "vitals"
  | "nutrition"
  | "exercise"
  | "wellness"
  | "social"
  | "education"
  | "system";

export interface RecordEventParams {
  category: EventCategory;
  eventType: string;
  source: string;
  title: string;
  titleEn?: string;
  description?: string;
  data?: Record<string, unknown>;
  numericValue?: number;
  numericUnit?: string;
  eventDate?: Date;
}

/**
 * Hook for recording patient events from any module.
 * Automatically uses the current patient context.
 * Only records to DB if a patient is selected (patient mode).
 * In guest mode, events are stored locally as fallback.
 */
export function usePatientEvents(defaultSource: string) {
  const { mode, patient, canSaveToDb } = usePatientContext();
  const [pending, setPending] = React.useState(false);

  /**
   * Record a single event. Returns true if saved to DB, false if local-only.
   */
  const recordEvent = React.useCallback(
    async (params: Omit<RecordEventParams, "source"> & { source?: string }): Promise<boolean> => {
      const source = params.source || defaultSource;

      // If we can save to DB (patient or self mode)
      if (canSaveToDb() && patient) {
        setPending(true);
        try {
          const res = await fetch("/api/patient-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: patient.id,
              category: params.category,
              eventType: params.eventType,
              source,
              title: params.title,
              titleEn: params.titleEn,
              description: params.description,
              data: params.data,
              numericValue: params.numericValue?.toString(),
              numericUnit: params.numericUnit,
              eventDate: params.eventDate?.toISOString() ?? new Date().toISOString(),
            }),
          });
          setPending(false);
          return res.ok;
        } catch {
          setPending(false);
          return false;
        }
      }

      // Guest mode — store locally as fallback
      try {
        const localKey = `medisoft_events_${source}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
        existing.push({
          ...params,
          source,
          eventDate: params.eventDate?.toISOString() ?? new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        // Keep only last 200 events per source locally
        if (existing.length > 200) existing.splice(0, existing.length - 200);
        localStorage.setItem(localKey, JSON.stringify(existing));
      } catch {
        // Storage full
      }
      return false;
    },
    [canSaveToDb, patient, defaultSource]
  );

  /**
   * Record multiple events at once (batch).
   */
  const recordEvents = React.useCallback(
    async (events: Array<Omit<RecordEventParams, "source"> & { source?: string }>): Promise<boolean> => {
      if (!canSaveToDb() || !patient) {
        // Store locally
        for (const evt of events) {
          await recordEvent(evt);
        }
        return false;
      }

      setPending(true);
      try {
        const res = await fetch("/api/patient-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: events.map((evt) => ({
              patientId: patient.id,
              category: evt.category,
              eventType: evt.eventType,
              source: evt.source || defaultSource,
              title: evt.title,
              titleEn: evt.titleEn,
              description: evt.description,
              data: evt.data,
              numericValue: evt.numericValue?.toString(),
              numericUnit: evt.numericUnit,
              eventDate: evt.eventDate?.toISOString() ?? new Date().toISOString(),
            })),
          }),
        });
        setPending(false);
        return res.ok;
      } catch {
        setPending(false);
        return false;
      }
    },
    [canSaveToDb, patient, defaultSource, recordEvent]
  );

  return {
    recordEvent,
    recordEvents,
    pending,
    mode,
    patient,
    canSaveToDb: canSaveToDb(),
  };
}
