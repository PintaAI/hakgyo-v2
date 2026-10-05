"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  LandmarkIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  QrCodeIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CourseCover } from "~/components/course-cover";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatRupiah, type PaymentMethod } from "~/lib/payments/payment";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

const methodOptions: Record<
  PaymentMethod,
  { label: string; description: string; icon: typeof QrCodeIcon }
> = {
  QRIS: {
    label: "QRIS",
    description: "Scan dengan m-banking atau e-wallet apa pun.",
    icon: QrCodeIcon,
  },
  BANK_TRANSFER: {
    label: "Transfer bank",
    description: "Transfer ke rekening penyelenggara.",
    icon: LandmarkIcon,
  },
};

function formatPeriod(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt) {
    return `${dateFormatter.format(startsAt)} – ${dateFormatter.format(endsAt)}`;
  }
  if (startsAt) return `Mulai ${dateFormatter.format(startsAt)}`;
  if (endsAt) return `Sampai ${dateFormatter.format(endsAt)}`;
  return "Jadwal menyusul";
}

export function CohortCheckout({
  cohortId,
  inviteToken,
}: {
  cohortId: string;
  inviteToken?: string;
}) {
  const router = useRouter();
  const checkout = api.payment.getCohortCheckout.useQuery(
    { cohortId, inviteToken },
    { retry: false },
  );
  const start = api.payment.startCohortCheckout.useMutation();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const data = checkout.data;
  const openPaymentId = data?.openPaymentId;

  // A learner returning to checkout continues the payment they started.
  useEffect(() => {
    if (openPaymentId) router.replace(`/learn/payments/${openPaymentId}`);
  }, [openPaymentId, router]);

  if (checkout.error) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-10 text-center">
          <LockKeyholeIcon className="text-muted-foreground mx-auto size-6" />
          <p className="mt-3 font-medium">Group belajar tidak ditemukan</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Link mungkin sudah tidak berlaku. Hubungi penyelenggara kelas.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!data || openPaymentId) {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const selectedMethod =
    method ?? (data.methods.length === 1 ? data.methods[0]! : null);
  const free = data.price === 0;

  async function submit() {
    if (!free && !selectedMethod) {
      toast.error("Pilih metode pembayaran.");
      return;
    }
    try {
      const result = await start.mutateAsync({
        cohortId,
        inviteToken,
        method: free ? undefined : (selectedMethod ?? undefined),
      });
      if (result.type === "PAYMENT") {
        router.push(`/learn/payments/${result.paymentId}`);
      } else {
        toast.success("Kamu sudah terdaftar di Group belajar ini.");
        router.push(`/learn/${result.courseId}`);
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Checkout belum berhasil.",
      );
    }
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="gap-0 overflow-hidden py-0">
        <CourseCover
          title={data.course.title}
          thumbnailUrl={data.course.thumbnailUrl}
          priority
          sizes="(min-width: 768px) 60vw, 100vw"
          className="aspect-[16/7] w-full"
        />
        <CardContent className="space-y-4 py-5">
          <div>
            <p className="text-primary text-sm font-semibold">
              {data.organizationName}
            </p>
            <h1 className="font-heading mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
              {data.cohort.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Group belajar untuk {data.course.title}
            </p>
          </div>
          {data.cohort.description ? (
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {data.cohort.description}
            </p>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="text-muted-foreground size-4" />
              <dt className="sr-only">Periode</dt>
              <dd>{formatPeriod(data.cohort.startsAt, data.cohort.endsAt)}</dd>
            </div>
            {data.cohort.seatsLeft !== null ? (
              <div className="flex items-center gap-2">
                <UsersIcon className="text-muted-foreground size-4" />
                <dt className="sr-only">Kuota</dt>
                <dd>Sisa {data.cohort.seatsLeft} kursi</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div>
            <p className="text-muted-foreground text-sm">Biaya</p>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {free ? "Gratis" : formatRupiah(data.price)}
            </p>
          </div>

          {data.blocker ? (
            <div className="bg-muted/60 space-y-3 rounded-lg p-4 text-sm">
              <p>{data.blockerMessage}</p>
              {data.blocker === "ALREADY_ENROLLED" ? (
                <Link
                  href={`/learn/${data.course.id}`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  Buka kurikulum
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              {!free ? (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">
                    Metode pembayaran
                  </legend>
                  {data.methods.map((option) => {
                    const {
                      label,
                      description,
                      icon: Icon,
                    } = methodOptions[option];
                    const checked = selectedMethod === option;
                    return (
                      <label
                        key={option}
                        className={cn(
                          "hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          checked && "border-primary bg-primary/5",
                        )}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={option}
                          checked={checked}
                          onChange={() => setMethod(option)}
                          className="sr-only"
                        />
                        <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {label}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}
              <Button
                size="lg"
                className="w-full"
                disabled={start.isPending || (!free && !selectedMethod)}
                onClick={() => void submit()}
              >
                {start.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {free ? "Gabung Group belajar" : "Lanjut ke pembayaran"}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              {!free ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Setelah membayar, unggah bukti pembayaran. Penyelenggara akan
                  memeriksa dan mengaktifkan akses belajarmu.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
