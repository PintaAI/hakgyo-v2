import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Headline, Kicker, leadText } from "~/components/brand/typography";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[60svh] place-items-center px-5 py-10 sm:min-h-[70svh] sm:py-16">
      <section className="w-full max-w-2xl text-center">
        <Kicker className="justify-center">404</Kicker>
        <Headline
          as="h1"
          title="Halaman tidak ditemukan."
          className="mt-3 sm:mt-5"
        />
        <p className={cn(leadText, "mx-auto mt-4")}>
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
