"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getScanImageUrl } from "@/lib/mediscan/client";
import { ScanImageViewer } from "@/components/mediscan/scan-image-viewer";
import type { Annotation } from "@/lib/validations/scan";

interface Props {
  scanId: string;
  annotations: Annotation[];
}

/**
 * Detail-page wrapper for the read-only viewer.
 *
 * The image lives in a private Supabase bucket, so we fetch a signed URL
 * via /api/mediscan/image/[id] on mount and feed it to the viewer.
 */
export function ScanDetailViewer({ scanId, annotations }: Props) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getScanImageUrl(scanId);
      if (cancelled) return;
      if (u) {
        setUrl(u);
      } else {
        setError(
          "Image not available. Supabase Storage may not be configured, or the file has been removed.",
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30">
        <Loader2 className="size-5 animate-spin text-[color:var(--color-muted-foreground)]" />
      </div>
    );
  }
  if (error || !url) {
    return (
      <Alert variant="info">
        <AlertTitle>Image unavailable</AlertTitle>
        <AlertDescription>{error ?? "Unknown error"}</AlertDescription>
      </Alert>
    );
  }
  return (
    <ScanImageViewer
      imageUrl={url}
      annotations={annotations}
      readOnly
      maxHeight={640}
    />
  );
}
