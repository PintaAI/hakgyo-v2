import Link from "next/link";
import { ArrowLeftIcon, SearchXIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[70svh] place-items-center px-5 py-16">
      <section className="w-full max-w-xl text-center">
        <span className="bg-muted text-muted-foreground mx-auto grid size-14 place-items-center rounded-2xl">
          <SearchXIcon className="size-7" aria-hidden="true" />
        </span>
        <p className="text-primary mt-6 text-sm font-bold tracking-widest uppercase">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Halaman tidak ditemukan
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-7">
          Tautan mungkin sudah berubah, atau konten yang kamu cari tidak lagi
          tersedia.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/catalog" className={buttonVariants({ size: "lg" })}>
            Jelajahi katalog
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <ArrowLeftIcon aria-hidden="true" />
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
