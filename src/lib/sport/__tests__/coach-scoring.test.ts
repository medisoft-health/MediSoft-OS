import { describe, expect, it } from "vitest";
import {
  calculateCoachScore,
  scoreAcademic,
  scoreCertifications,
  scoreExperience,
  scoreCompleteness,
  scoreAdmin,
  scorePerformance,
  tierForScore,
  DEGREE_LEVELS,
  CERT_ISSUERS,
  COACH_SPECIALTIES,
} from "@/lib/sport/coach-scoring";

describe("scoreAcademic", () => {
  it("scores degrees on the expected scale", () => {
    expect(scoreAcademic("doctorate")).toBe(20);
    expect(scoreAcademic("masters")).toBe(16);
    expect(scoreAcademic("bachelors")).toBe(12);
    expect(scoreAcademic("diploma")).toBe(7);
    expect(scoreAcademic("none")).toBe(0);
    expect(scoreAcademic(null)).toBe(0);
  });
  it("adds a relevance bonus capped at 20", () => {
    expect(scoreAcademic("bachelors", "sports_science")).toBe(15);
    expect(scoreAcademic("doctorate", "medicine")).toBe(20); // capped
    expect(scoreAcademic("none", "medicine")).toBe(0); // no bonus without a degree
  });
});

describe("scoreCertifications", () => {
  it("returns 0 with no certs", () => {
    expect(scoreCertifications([])).toBe(0);
    expect(scoreCertifications(undefined)).toBe(0);
  });
  it("counts recognized issuers at 8 pts each, capped at 3 certs", () => {
    const certs = [
      { issuer: "nasm" },
      { issuer: "issa" },
      { issuer: "ace" },
      { issuer: "acsm" },
    ];
    const pts = scoreCertifications(certs);
    expect(pts).toBeGreaterThanOrEqual(24);
    expect(pts).toBeLessThanOrEqual(25);
  });
  it("ignores unrecognized issuers", () => {
    expect(scoreCertifications([{ issuer: "other" }])).toBe(0);
  });
  it("never exceeds 25", () => {
    const many = Array.from({ length: 10 }, () => ({ issuer: "nasm" }));
    expect(scoreCertifications(many)).toBeLessThanOrEqual(25);
  });
});

describe("scoreExperience", () => {
  it("maps year bands correctly", () => {
    expect(scoreExperience(0)).toBe(0);
    expect(scoreExperience(1)).toBe(3);
    expect(scoreExperience(3)).toBe(7);
    expect(scoreExperience(5)).toBe(11);
    expect(scoreExperience(8)).toBe(13);
    expect(scoreExperience(12)).toBe(15);
    expect(scoreExperience(null)).toBe(0);
  });
});

describe("scoreCompleteness", () => {
  it("awards 2 pts per signal up to 10", () => {
    expect(
      scoreCompleteness({
        hasAvatar: true,
        bioLength: 120,
        languagesCount: 2,
        hasProfessionalLinks: true,
        hasCv: true,
      })
    ).toBe(10);
    expect(scoreCompleteness({ hasAvatar: true })).toBe(2);
    expect(scoreCompleteness({ bioLength: 10 })).toBe(0); // too short
  });
});

describe("scoreAdmin", () => {
  it("clamps to 0..15", () => {
    expect(scoreAdmin(10)).toBe(10);
    expect(scoreAdmin(20)).toBe(15);
    expect(scoreAdmin(-5)).toBe(0);
    expect(scoreAdmin(null)).toBe(0);
  });
});

describe("scorePerformance", () => {
  it("is 0 for a brand-new coach", () => {
    expect(scorePerformance({})).toBe(0);
  });
  it("rewards strong ratings with enough reviews", () => {
    const pts = scorePerformance({
      ratingAvg: 5,
      ratingCount: 10,
      adherenceRate: 1,
      responseRate: 1,
    });
    expect(pts).toBe(15);
  });
  it("dampens with very few reviews", () => {
    const few = scorePerformance({ ratingAvg: 5, ratingCount: 1 });
    const many = scorePerformance({ ratingAvg: 5, ratingCount: 5 });
    expect(few).toBeLessThan(many);
  });
});

describe("tierForScore", () => {
  it("maps totals to tiers", () => {
    expect(tierForScore(90)).toBe("elite");
    expect(tierForScore(75)).toBe("professional");
    expect(tierForScore(60)).toBe("certified");
    expect(tierForScore(45)).toBe("associate");
    expect(tierForScore(20)).toBe("unranked");
  });
});

describe("calculateCoachScore", () => {
  it("never exceeds 100 and sums the breakdown", () => {
    const res = calculateCoachScore({
      highestDegree: "doctorate",
      studyField: "sports_science",
      yearsExperience: 12,
      certifications: [{ issuer: "nasm" }, { issuer: "issa" }, { issuer: "acsm" }],
      hasAvatar: true,
      bioLength: 200,
      languagesCount: 2,
      hasProfessionalLinks: true,
      hasCv: true,
      adminScore: 15,
      ratingAvg: 5,
      ratingCount: 10,
      adherenceRate: 1,
      responseRate: 1,
    });
    expect(res.total).toBeLessThanOrEqual(100);
    const sum =
      res.breakdown.academic +
      res.breakdown.certifications +
      res.breakdown.experience +
      res.breakdown.completeness +
      res.breakdown.admin +
      res.breakdown.performance;
    expect(Math.round(sum * 10) / 10).toBe(res.total);
    expect(res.tier).toBe("elite");
  });

  it("caps a new coach (no performance) at <= 85", () => {
    const res = calculateCoachScore({
      highestDegree: "doctorate",
      studyField: "medicine",
      yearsExperience: 20,
      certifications: [{ issuer: "nasm" }, { issuer: "issa" }, { issuer: "acsm" }],
      hasAvatar: true,
      bioLength: 200,
      languagesCount: 3,
      hasProfessionalLinks: true,
      hasCv: true,
      adminScore: 15,
      // no reviews/performance yet
    });
    expect(res.total).toBeLessThanOrEqual(85);
    expect(res.breakdown.performance).toBe(0);
  });

  it("produces a low tier for a bare profile", () => {
    const res = calculateCoachScore({
      highestDegree: "none",
      yearsExperience: 0,
    });
    expect(res.total).toBeLessThan(40);
    expect(res.tier).toBe("unranked");
  });
});

describe("reference catalogs", () => {
  it("expose non-empty lists", () => {
    expect(DEGREE_LEVELS.length).toBeGreaterThanOrEqual(5);
    expect(CERT_ISSUERS.some((c) => c.recognized)).toBe(true);
    expect(COACH_SPECIALTIES.length).toBeGreaterThanOrEqual(8);
  });
});
