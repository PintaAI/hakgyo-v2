"use client";

import Link from "next/link";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { Button, buttonVariants } from "~/components/ui/button";

export default function LearningError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-10rem)] max-w-2xl items-center justify-center">
      <section className="bg-card ring-foreground/10 w-full rounded-lg p-8 text-center ring-1 md:p-12">
        <span className="mx-auto flex size-12 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertTriangleIcon className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Ruang belajar belum dapat dimuat
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md">
          Koneksi mungkin terputus atau akses course berubah. Coba muat ulang
          halaman ini.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset} size="lg">
            <RefreshCwIcon /> Coba lagi
          </Button>
          <Link
            href="/catalog"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Buka katalog
          </Link>
        </div>
      </section>
    </div>
  );
}
