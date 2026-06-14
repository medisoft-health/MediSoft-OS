"use client";
import EmergencyMode from "@/components/sport/emergency-mode";
import JourneyQuickActions from "@/components/sport/journey-quick-actions";

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Emergency Mode — shows full-screen alert if dangerous readings detected */}
      <EmergencyMode />
      
      {/* Page Content */}
      {children}
      
      {/* Quick Actions — floating button with bottom sheets */}
      <JourneyQuickActions />
    </>
  );
}
