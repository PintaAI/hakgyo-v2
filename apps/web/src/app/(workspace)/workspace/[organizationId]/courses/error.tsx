"use client";

import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

export default function CoursesError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-80 w-full max-w-6xl flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center">
      <AlertCircleIcon className="text-destructive size-7" />
      <h1 className="font-heading mt-4 text-xl font-semibold">
        Courses belum dapat dimuat
      </h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Periksa koneksi Anda, lalu coba lagi.
      </p>
      <Button className="mt-5" variant="outline" onClick={reset}>
        <RefreshCwIcon data-icon="inline-start" />
        Coba lagi
      </Button>
    </div>
  );
}
