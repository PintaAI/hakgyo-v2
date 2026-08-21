"use client";

import Link from "next/link";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { Button, buttonVariants } from "~/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[70svh] place-items-center px-5 py-16">
      <section className="bg-card w-full max-w-xl rounded-2xl border p-8 text-center shadow-sm sm:p-12">
        <span className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-xl">
          <AlertTriangleIcon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Halaman belum dapat dimuat
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md leading-6">
          Terjadi kendala sementara. Coba lagi tanpa kehilangan halaman yang
          sedang kamu buka.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCwIcon aria-hidden="true" />
            Coba lagi
          </Button>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
