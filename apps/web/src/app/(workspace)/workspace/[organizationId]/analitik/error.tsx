"use client";

import { Button } from "~/components/ui/button";

export default function AnalyticsError({ reset }: { reset: () => void }) {
  return (
    <div className="bg-muted/20 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="font-medium">Analitik belum dapat dimuat</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Terjadi kendala saat menghitung data. Coba muat ulang sebentar lagi.
      </p>
      <Button variant="outline" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
