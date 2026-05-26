import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]">
            <Compass className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight">
              Page not found
            </h2>
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              The URL you followed doesn&apos;t exist. It may have moved or
              been removed.
            </p>
          </div>
          <Link href="/">
            <Button variant="brand" size="md">
              <Home className="size-4" />
              Take me home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
