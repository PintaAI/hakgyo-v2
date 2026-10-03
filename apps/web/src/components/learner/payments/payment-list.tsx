"use client";

import Link from "next/link";
import { ChevronRightIcon, LoaderCircleIcon, ReceiptIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import {
  formatRupiah,
  paymentMethodLabels,
  paymentStatusLabels,
} from "~/lib/payments/payment";
import { api } from "~/trpc/react";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

export function PaymentList() {
  const payments = api.payment.listMine.useInfiniteQuery(
    {},
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const items = payments.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Pembayaran
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Riwayat pembayaran Group belajar kamu.
        </p>
      </div>
      {payments.error ? (
        <p className="text-destructive text-sm">{payments.error.message}</p>
      ) : payments.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="Belum ada pembayaran"
          description="Pembayaran muncul di sini setelah kamu checkout Group belajar berbayar."
          action={
            <Link
              href="/catalog"
              className={buttonVariants({ className: "mt-4" })}
            >
              Jelajahi kursus
            </Link>
          }
        />
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {items.map((payment) => (
            <li key={payment.id}>
              <Link
                href={`/learn/payments/${payment.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{payment.cohort.name}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {payment.cohort.course.title} ·{" "}
                    {paymentMethodLabels[payment.method]} ·{" "}
                    {dateFormatter.format(payment.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {formatRupiah(payment.amount)}
                  </p>
                  <Badge
                    variant={
                      payment.status === "PAID"
                        ? "secondary"
                        : payment.status === "REJECTED"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {paymentStatusLabels[payment.status]}
                  </Badge>
                </div>
                <ChevronRightIcon className="text-muted-foreground size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {payments.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={payments.isFetchingNextPage}
            onClick={() => void payments.fetchNextPage()}
          >
            {payments.isFetchingNextPage ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
            Muat lebih banyak
          </Button>
        </div>
      ) : null}
    </div>
  );
}
