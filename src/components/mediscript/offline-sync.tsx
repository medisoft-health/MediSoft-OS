"use client";

import * as React from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Offline Recording Sync Manager
 *
 * Monitors network connectivity and manages offline recording state.
 * When offline:
 * - Recording continues normally (MediaRecorder is local)
 * - Audio is stored in IndexedDB
 * - A visual indicator shows offline status
 *
 * When connectivity returns:
 * - Automatically syncs pending recordings
 * - Shows sync progress
 *
 * This component wraps the recording step to provide offline resilience.
 */

interface PendingRecording {
  id: string;
  patientId: number;
  patientLabel: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: number;
  encounterType: string;
  visitReason: string;
}

interface Props {
  children: React.ReactNode;
}

type SyncStatus = "online" | "offline" | "syncing" | "error";

const DB_NAME = "mediscript-offline";
const STORE_NAME = "pending-recordings";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingRecording(recording: PendingRecording): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(recording);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingRecordings(): Promise<PendingRecording[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingRecording(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function OfflineSyncProvider({ children }: Props) {
  const [status, setStatus] = React.useState<SyncStatus>("online");
  const [pendingCount, setPendingCount] = React.useState(0);
  const [syncProgress, setSyncProgress] = React.useState<{ current: number; total: number } | null>(null);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => {
      setStatus("online");
      // Auto-sync when back online
      syncPendingRecordings();
    };
    const handleOffline = () => {
      setStatus("offline");
    };

    // Set initial status
    if (!navigator.onLine) {
      setStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check for pending recordings on mount
    checkPending();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkPending = async () => {
    try {
      const pending = await getPendingRecordings();
      setPendingCount(pending.length);
    } catch {
      // IndexedDB not available
    }
  };

  const syncPendingRecordings = async () => {
    try {
      const pending = await getPendingRecordings();
      if (pending.length === 0) return;

      setStatus("syncing");
      setSyncProgress({ current: 0, total: pending.length });

      for (let i = 0; i < pending.length; i++) {
        const recording = pending[i];
        setSyncProgress({ current: i + 1, total: pending.length });

        try {
          // Upload the recording for transcription
          const formData = new FormData();
          formData.append("audio", recording.blob, `recording-${recording.id}.webm`);
          formData.append("patientId", String(recording.patientId));
          formData.append("encounterType", recording.encounterType);
          formData.append("visitReason", recording.visitReason);

          const res = await fetch("/api/mediscript/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            await deletePendingRecording(recording.id);
          }
        } catch {
          // Will retry next time
          console.warn(`[offline-sync] Failed to sync recording ${recording.id}`);
        }
      }

      await checkPending();
      setStatus("online");
      setSyncProgress(null);
    } catch {
      setStatus("error");
      setSyncProgress(null);
    }
  };

  return (
    <div className="relative">
      {/* Network status indicator */}
      <NetworkStatusBadge
        status={status}
        pendingCount={pendingCount}
        syncProgress={syncProgress}
        onRetrySync={syncPendingRecordings}
      />
      {children}
    </div>
  );
}

function NetworkStatusBadge({
  status,
  pendingCount,
  syncProgress,
  onRetrySync,
}: {
  status: SyncStatus;
  pendingCount: number;
  syncProgress: { current: number; total: number } | null;
  onRetrySync: () => void;
}) {
  // Don't show anything when online with no pending
  if (status === "online" && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between rounded-lg border px-3 py-2",
        status === "offline" && "border-amber-300 bg-amber-50",
        status === "syncing" && "border-blue-300 bg-blue-50",
        status === "error" && "border-rose-300 bg-rose-50",
        status === "online" && pendingCount > 0 && "border-emerald-300 bg-emerald-50",
      )}
    >
      <div className="flex items-center gap-2">
        {status === "offline" && (
          <>
            <CloudOff className="size-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-800">
              Offline — recording will continue locally
            </span>
          </>
        )}
        {status === "syncing" && (
          <>
            <RefreshCw className="size-4 text-blue-600 animate-spin" />
            <span className="text-xs font-medium text-blue-800">
              Syncing {syncProgress?.current}/{syncProgress?.total} recordings...
            </span>
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle className="size-4 text-rose-600" />
            <span className="text-xs font-medium text-rose-800">
              Sync failed — {pendingCount} recording{pendingCount > 1 ? "s" : ""} pending
            </span>
          </>
        )}
        {status === "online" && pendingCount > 0 && (
          <>
            <Cloud className="size-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800">
              Back online — {pendingCount} recording{pendingCount > 1 ? "s" : ""} ready to sync
            </span>
          </>
        )}
      </div>

      {(status === "error" || (status === "online" && pendingCount > 0)) && (
        <Button variant="ghost" size="sm" onClick={onRetrySync} className="h-6 text-[10px]">
          <RefreshCw className="size-3 mr-1" />
          Sync now
        </Button>
      )}
    </div>
  );
}

// Export utility functions for use by the wizard
export { savePendingRecording, getPendingRecordings, deletePendingRecording };
export type { PendingRecording };
