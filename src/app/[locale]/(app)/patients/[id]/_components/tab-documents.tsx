import { FileText, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Documents tab — placeholder until Supabase Storage is wired.
 *
 * Schema-wise: documents will use a yet-to-be-added `documents` table (or
 * the existing `scans` table for imaging). For Phase 2 we surface the
 * intended UX without persisting anything.
 */
export function TabDocuments() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-[color:var(--color-brand-navy)]" />
            <CardTitle className="text-base">Patient documents</CardTitle>
          </div>
          <CardDescription>
            Prescriptions, lab reports, imaging studies, insurance cards, and
            referral letters live here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="info">
            <Upload />
            <AlertTitle>Supabase Storage not yet configured</AlertTitle>
            <AlertDescription>
              Once{" "}
              <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[11px]">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[11px]">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              are added to <code>.env.local</code> and a{" "}
              <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[11px]">
                patient-documents
              </code>{" "}
              bucket is created, this tab will accept PDF, image, and DICOM
              uploads with categorisation and version history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <FileText className="size-8 text-[color:var(--color-muted-foreground)]" />
          <p className="text-sm font-semibold">No documents</p>
          <p className="text-xs text-[color:var(--color-muted-foreground)]">
            Documents uploaded by your clinic will appear here, grouped by
            category and date.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
