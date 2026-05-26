"use client";

import * as React from "react";
import { ArrowLeft, Calendar, Mic, Sparkles } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calculateAge,
  formatClinicalDate,
  formatPatientId,
  getInitials,
} from "@/lib/utils";
import { RecordVitalsButton } from "./record-vitals-button";

interface HeaderPatient {
  id: number;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  dateOfBirth: string;
  sex: "male" | "female" | "other" | "unknown";
  bloodType: string | null;
  insuranceProvider: string | null;
  insuranceId: string | null;
  saudiId: string | null;
  mrn: string | null;
  phone: string | null;
  updatedAt: Date;
}

interface Props {
  patient: HeaderPatient;
}

/**
 * Sticky patient header — anchor for the whole detail page.
 *
 * Provides identity at a glance + the three primary actions:
 *   1. Record vitals (this PR)
 *   2. Start session   (deferred — MediScript module)
 *   3. AI Summary      (deferred — Gemini integration)
 */
export function PatientHeader({ patient }: Props) {
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const fullNameAr =
    patient.firstNameAr && patient.lastNameAr
      ? `${patient.firstNameAr} ${patient.lastNameAr}`
      : null;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-[color:var(--color-border)] bg-[color:var(--color-card)]/95 px-6 backdrop-blur lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-7xl py-5">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
          >
            <ArrowLeft className="size-3.5" /> All patients
          </Link>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <Avatar className="size-16 shrink-0">
            <AvatarFallback className="text-lg">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-black tracking-tight">{fullName}</h1>
              {fullNameAr && (
                <span dir="rtl" lang="ar" className="text-lg font-bold text-[color:var(--color-muted-foreground)]">
                  {fullNameAr}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-mono text-[color:var(--color-muted-foreground)]">
                {formatPatientId(patient.id)}
              </span>
              <span className="text-[color:var(--color-muted-foreground)]">·</span>
              <span>
                <strong className="tabular-nums">{age}</strong> years
              </span>
              <span className="text-[color:var(--color-muted-foreground)]">·</span>
              <span className="capitalize">{patient.sex}</span>
              {patient.bloodType && patient.bloodType !== "unknown" && (
                <>
                  <span className="text-[color:var(--color-muted-foreground)]">·</span>
                  <Badge variant="outline" className="text-[10px]">
                    {patient.bloodType}
                  </Badge>
                </>
              )}
              {patient.insuranceProvider ? (
                <Badge variant="success" className="text-[10px]">
                  Insured · {patient.insuranceProvider}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Cash
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--color-muted-foreground)]">
              {patient.saudiId && (
                <span>
                  ID:{" "}
                  <span className="font-mono text-[color:var(--color-foreground)]">
                    {patient.saudiId}
                  </span>
                </span>
              )}
              {patient.mrn && (
                <span>
                  MRN:{" "}
                  <span className="font-mono text-[color:var(--color-foreground)]">
                    {patient.mrn}
                  </span>
                </span>
              )}
              {patient.phone && (
                <span>
                  Phone:{" "}
                  <span className="text-[color:var(--color-foreground)]">{patient.phone}</span>
                </span>
              )}
              <span>Updated {formatClinicalDate(patient.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RecordVitalsButton patientId={patient.id} />
            <Link href={`/mediscript/new?patientId=${patient.id}`}>
              <Button variant="outline" size="sm">
                <Mic className="size-4" /> Start session
              </Button>
            </Link>
            <Button variant="brand" size="sm" disabled title="Available with the Gemini AI integration">
              <Sparkles className="size-4" /> AI Summary
            </Button>
            <Button variant="ghost" size="icon" title="Schedule" disabled>
              <Calendar className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
