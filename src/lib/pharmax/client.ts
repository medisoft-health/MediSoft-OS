"use client";

import type { DrugSafetyResult } from "@/lib/ai/pharmax-analyzer";
import type { RxNormCandidate } from "@/lib/ai/rxnorm";

/**
 * PharmaX client helpers — talk to the API routes from the browser.
 */

export async function searchDrug(query: string): Promise<RxNormCandidate[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  let res: Response;
  try {
    res = await fetch(`/api/pharmax/drug-search?q=${encodeURIComponent(q)}`);
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const data = (await res.json()) as { candidates?: RxNormCandidate[] };
  return data.candidates ?? [];
}

export interface AnalyzeArgs {
  drugs: Array<{ drugName: string; rxcui?: string }>;
  patientId?: number;
}

export type AnalyzeResult =
  | { kind: "ok"; data: DrugSafetyResult }
  | { kind: "error"; message: string };

export async function analyzeDrugSafetyClient(
  args: AnalyzeArgs,
  signal?: AbortSignal,
): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch("/api/pharmax/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { kind: "error", message: "Cancelled" };
    }
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    return { kind: "error", message: msg };
  }

  const data = (await res.json()) as DrugSafetyResult;
  return { kind: "ok", data };
}
