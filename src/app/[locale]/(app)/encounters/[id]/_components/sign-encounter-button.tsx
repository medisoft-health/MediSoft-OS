"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signEncounter } from "@/lib/actions/encounters";

interface Props {
  encounterId: string;
}

/**
 * Small client button that wraps the signEncounter() server action.
 * Lives next to the encounter header on draft (`awaiting_review`) encounters.
 */
export function SignEncounterButton({ encounterId }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <Button
      variant="brand"
      size="sm"
      disabled={submitting}
      onClick={async () => {
        setSubmitting(true);
        const result = await signEncounter({ encounterId });
        setSubmitting(false);
        if (!result.ok) {
          toast.error("Could not sign encounter", { description: result.error });
          return;
        }
        toast.success("Encounter signed");
        router.refresh();
      }}
    >
      {submitting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Signing…
        </>
      ) : (
        <>
          <BadgeCheck className="size-4" />
          Sign encounter
        </>
      )}
    </Button>
  );
}
