import {
  getDashboardStats,
  getRecentActivity,
  getTodayEncounters,
} from "@/lib/queries/dashboard";
import { DashboardContextShell } from "./context-shell";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = {
  title: "Dashboard",
};

/**
 * Unified dashboard. All numbers are computed from the database at request
 * time. Three parallel queries fan out so this stays fast even as the table
 * sizes grow.
 *
 * The DashboardContextShell client component handles adaptive context
 * (emergency/sport/radiology banners) plus stagger-entry animations.
 */
export default async function DashboardHome() {
  const [stats, activity, today] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(10),
    getTodayEncounters(),
  ]);

  return (
    <DashboardContextShell
      stats={stats}
      todayEncounters={today}
      recentActivity={activity}
    />
  );
}
