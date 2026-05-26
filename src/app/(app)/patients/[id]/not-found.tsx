import Link from "next/link";
import { UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientNotFound() {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]">
            <UserX className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight">Patient not found</h2>
            <p className="max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
              This record may have been deleted, or the ID in the URL is
              incorrect. Use the patient list to find the right record.
            </p>
          </div>
          <Link href="/patients">
            <Button variant="brand" size="md">
              Back to patients
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
