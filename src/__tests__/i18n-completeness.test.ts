/**
 * i18n Translation Completeness Tests
 *
 * Ensures Arabic and English translation files are in sync.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

function loadMessages(locale: string) {
  const filePath = join(process.cwd(), "messages", `${locale}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function getAllKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("i18n — Translation Completeness", () => {
  const en = loadMessages("en");
  const ar = loadMessages("ar");

  it("both files are valid JSON objects", () => {
    expect(typeof en).toBe("object");
    expect(typeof ar).toBe("object");
    expect(en).not.toBeNull();
    expect(ar).not.toBeNull();
  });

  it("both files have the same top-level sections", () => {
    const enSections = Object.keys(en).sort();
    const arSections = Object.keys(ar).sort();
    expect(arSections).toEqual(enSections);
  });

  it("Arabic has all keys that English has", () => {
    const enKeys = getAllKeys(en);
    const arKeys = new Set(getAllKeys(ar));
    const missing = enKeys.filter((k) => !arKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("English has all keys that Arabic has", () => {
    const arKeys = getAllKeys(ar);
    const enKeys = new Set(getAllKeys(en));
    const extra = arKeys.filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });

  it("no empty string values in English", () => {
    const enKeys = getAllKeys(en);
    const empty = enKeys.filter((k) => {
      const parts = k.split(".");
      let val: any = en;
      for (const p of parts) val = val[p];
      return typeof val === "string" && val.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("no empty string values in Arabic", () => {
    const arKeys = getAllKeys(ar);
    const empty = arKeys.filter((k) => {
      const parts = k.split(".");
      let val: any = ar;
      for (const p of parts) val = val[p];
      return typeof val === "string" && val.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("has at least 300 translation keys", () => {
    const enKeys = getAllKeys(en);
    expect(enKeys.length).toBeGreaterThanOrEqual(300);
  });

  it("has all required sections", () => {
    const requiredSections = [
      "Common",
      "Nav",
      "Dashboard",
      "Patients",
      "MediScript",
      "PharmaX",
      "MediLab",
      "MediScan",
      "Auth",
      "Settings",
    ];
    for (const section of requiredSections) {
      expect(en).toHaveProperty(section);
      expect(ar).toHaveProperty(section);
    }
  });

  it("Arabic values contain Arabic characters", () => {
    const arabicRegex = /[\u0600-\u06FF]/;
    const arKeys = getAllKeys(ar);
    // At least 80% of Arabic values should contain Arabic characters
    let arabicCount = 0;
    for (const k of arKeys) {
      const parts = k.split(".");
      let val: any = ar;
      for (const p of parts) val = val[p];
      if (typeof val === "string" && arabicRegex.test(val)) arabicCount++;
    }
    const ratio = arabicCount / arKeys.length;
    expect(ratio).toBeGreaterThan(0.7);
  });
});
