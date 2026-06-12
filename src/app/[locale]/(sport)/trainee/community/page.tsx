"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedCommunityPanel, CommunityHeader } from "@/components/sport/shared-community-panel";

/**
 * MediSport Standalone — Community page.
 * Thin wrapper around the shared, DB-backed community panel so the
 * standalone and integrated (/medisport) experiences stay mirrored.
 */
export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/trainee">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <CommunityHeader />
      </div>
      <SharedCommunityPanel defaultTab="feed" />
    </div>
  );
}
