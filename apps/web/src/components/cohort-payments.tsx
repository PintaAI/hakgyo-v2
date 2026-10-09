"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckIcon,
  ExternalLinkIcon,
  ImageIcon,
  LoaderCircleIcon,
  ReceiptIcon,
  SearchIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDialogs } from "~/components/ui/use-dialogs";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import {
  canTransitionPayment,
  formatRupiah,
  paymentMethodLabels,
  paymentStatusLabels,
  type PaymentStatus,
} from "~/lib/payments/payment";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type PaymentList = RouterOutputs["payment"]["listForCohort"];
type Payment = PaymentList["items"][number];

const filters: Array<{ value: PaymentStatus | "ALL"; label: string }> = [
  { value: "SUBMITTED", label: "Perlu verifikasi" },
  { value: "PENDING", label: "Menunggu pembayaran" },
  { value: "PAID", label: "Lunas" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "ALL", label: "Semua" },
];

const statusBadgeVariants: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUBMITTED: "default",
  PENDING: "outline",
  PAID: "secondary",
  REJECTED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Count of payments waiting for staff, for the tab badge. */
export function usePendingPaymentReviews(cohortId: string, enabled: boolean) {
  const query = api.payment.listForCohort.useQuery(
    { cohortId, status: "SUBMITTED", limit: 1 },
    { enabled },
  );
  return query.data?.counts.SUBMITTED;
}

export function CohortPayments({
  cohortId,
  organizationSlug,
  canManageSettings,
}: {
  cohortId: string;
  organizationSlug: string;
  canManageSettings: boolean;
}) {
  const [filter, setFilter] = useState<PaymentStatus | "ALL">("SUBMITTED");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const payments = api.payment.listForCohort.useInfiniteQuery(
    {
      cohortId,
      status: filter === "ALL" ? undefined : filter,
      search: debouncedSearch || undefined,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const firstPage = payments.data?.pages[0];
  const items = payments.data?.pages.flatMap((page) => page.items) ?? [];
  const counts = firstPage?.counts ?? {};
  const selected = items.find((payment) => payment.id === selectedId) ?? null;
  const settingsHref = `/workspace/${organizationSlug}/settings/payments`;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Pembayaran
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Periksa bukti transfer atau QRIS di rekening/aplikasi merchant, lalu
            setujui agar siswa mendapat akses.
          </p>
        </div>
        {firstPage ? (
          <div className="text-right text-sm">
            <p className="text-muted-foreground text-xs">Harga kelas</p>
            <p className="font-medium tabular-nums">
              {firstPage.price > 0 ? formatRupiah(firstPage.price) : "Gratis"}
            </p>
          </div>
        ) : null}
      </div>

      {firstPage && firstPage.price > 0 && firstPage.methods.length === 0 ? (
        <div className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
          <AlertTriangleIcon className="text-destructive size-4 shrink-0" />
          <p className="flex-1">
            Siswa belum bisa membayar karena organisasi belum mengatur QRIS atau
            rekening bank.
          </p>
          {canManageSettings ? (
            <Link
              href={settingsHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Atur pembayaran
            </Link>
          ) : (
            <span className="text-muted-foreground text-xs">
              Hubungi owner atau admin organisasi.
            </span>
          )}
        </div>
      ) : null}
      {firstPage?.price === 0 ? (
        <p className="text-muted-foreground bg-muted/40 rounded-lg p-4 text-sm">
          Kelas ini gratis. Atur harga di tab Pengaturan agar siswa membayar
          sebelum bergabung.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter status pembayaran"
          className="flex flex-wrap gap-1.5"
        >
          {filters.map(({ value, label }) => {
            const count = value === "ALL" ? undefined : counts[value];
            return (
              <Button
                key={value}
                role="tab"
                aria-selected={filter === value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
              >
                {label}
                {count ? (
                  <span className="tabular-nums opacity-70">({count})</span>
                ) : null}
              </Button>
            );
          })}
        </div>
        <div className="relative lg:w-72">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Cari pembayaran"
            placeholder="Cari nama, email, atau kode"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {payments.error ? (
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <p className="text-destructive flex-1 text-sm">
            {payments.error.message}
          </p>
          <Button variant="outline" onClick={() => payments.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : payments.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          size="sm"
          icon={ReceiptIcon}
          title={
            filter === "SUBMITTED"
              ? "Tidak ada pembayaran yang perlu diverifikasi"
              : "Belum ada pembayaran"
          }
          description="Pembayaran muncul di sini setelah siswa checkout kelas ini."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead className="max-sm:hidden">Kode</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="max-sm:hidden">Metode</TableHead>
                <TableHead className="max-sm:hidden">Status</TableHead>
                <TableHead className="max-sm:hidden">Waktu</TableHead>
                <TableHead className="sr-only">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="max-sm:max-w-40 max-sm:whitespace-normal">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8 max-sm:hidden">
                        {payment.user.image ? (
                          <AvatarImage src={payment.user.image} alt="" />
                        ) : null}
                        <AvatarFallback>
                          {initials(payment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {payment.user.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {payment.user.email}
                        </p>
                        {/* Phones fold status, method and time in here. */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:hidden">
                          <Badge variant={statusBadgeVariants[payment.status]}>
                            {paymentStatusLabels[payment.status]}
                          </Badge>
                          <span className="text-muted-foreground">
                            {paymentMethodLabels[payment.method]} ·{" "}
                            {dateTimeFormatter.format(
                              payment.submittedAt ?? payment.createdAt,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-sm:hidden">
                    {payment.reference}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRupiah(payment.amount)}
                  </TableCell>
                  <TableCell className="max-sm:hidden">
                    {paymentMethodLabels[payment.method]}
                  </TableCell>
                  <TableCell className="max-sm:hidden">
                    <Badge variant={statusBadgeVariants[payment.status]}>
                      {paymentStatusLabels[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-sm:hidden">
                    {dateTimeFormatter.format(
                      payment.submittedAt ?? payment.createdAt,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={
                        payment.status === "SUBMITTED" ? "default" : "outline"
                      }
                      onClick={() => setSelectedId(payment.id)}
                    >
                      {payment.status === "SUBMITTED" ? "Periksa" : "Detail"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {payments.hasNextPage ? (
            <div className="flex justify-center border-t p-3">
              <Button
                variant="outline"
                size="sm"
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
      )}

      {selected ? (
        <PaymentReviewDialog
          cohortId={cohortId}
          payment={selected}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </section>
  );
}

function PaymentReviewDialog({
  cohortId,
  payment,
  onClose,
}: {
  cohortId: string;
  payment: Payment;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const { confirm, prompt, dialogs } = useDialogs();
  const proof = api.payment.getProofUrl.useQuery(
    { paymentId: payment.id },
    { enabled: payment.hasProof, staleTime: 4 * 60_000 },
  );
  const approve = api.payment.approve.useMutation();
  const reject = api.payment.reject.useMutation();
  const cancel = api.payment.cancelForCohort.useMutation();
  const pending = approve.isPending || reject.isPending || cancel.isPending;
  const status = payment.status;

  async function refresh() {
    await Promise.all([
      utils.payment.listForCohort.invalidate({ cohortId }),
      utils.enrollment.listCohortEnrollments.invalidate({ cohortId }),
    ]);
  }

  async function approvePayment() {
    const confirmed = await confirm({
      title: `Setujui pembayaran ${payment.reference}?`,
      description: `Pastikan ${formatRupiah(payment.amount)} sudah masuk. ${payment.user.name} akan langsung terdaftar di kelas ini.`,
      confirmLabel: "Setujui pembayaran",
    });
    if (!confirmed) return;
    try {
      await approve.mutateAsync({ paymentId: payment.id });
      await refresh();
      toast.success(`${payment.user.name} terdaftar di kelas.`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function rejectPayment(revertApproval: boolean) {
    const values = await prompt({
      title: revertApproval
        ? "Batalkan persetujuan?"
        : `Tolak pembayaran ${payment.reference}?`,
      description: revertApproval
        ? "Akses siswa dari pembayaran ini dicabut. Tulis alasan yang akan dilihat siswa."
        : "Siswa bisa mengunggah bukti baru. Tulis alasan yang akan dilihat siswa.",
      confirmLabel: revertApproval
        ? "Batalkan persetujuan"
        : "Tolak pembayaran",
      destructive: true,
      fields: [{ name: "reason", label: "Alasan", type: "textarea" }],
    });
    if (!values) return;
    try {
      const result = await reject.mutateAsync({
        paymentId: payment.id,
        reason: values.reason,
      });
      await refresh();
      toast.success(
        result.deactivated
          ? "Persetujuan dibatalkan dan akses siswa dicabut."
          : "Pembayaran ditolak.",
      );
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function cancelPayment() {
    const confirmed = await confirm({
      title: `Batalkan pembayaran ${payment.reference}?`,
      description:
        "Gunakan ini untuk checkout yang tidak dilanjutkan siswa. Siswa bisa checkout ulang.",
      confirmLabel: "Batalkan pembayaran",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await cancel.mutateAsync({ paymentId: payment.id });
      await refresh();
      toast.success("Pembayaran dibatalkan.");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const details: Array<[string, string | null]> = [
    ["Siswa", `${payment.user.name} · ${payment.user.email}`],
    ["Nominal", formatRupiah(payment.amount)],
    ["Metode", paymentMethodLabels[payment.method]],
    ["Dibuat", dateTimeFormatter.format(payment.createdAt)],
    [
      "Bukti dikirim",
      payment.submittedAt
        ? dateTimeFormatter.format(payment.submittedAt)
        : null,
    ],
    ["Nama pengirim", payment.payerName],
    ["Catatan siswa", payment.payerNote],
    ["Lunas", payment.paidAt ? dateTimeFormatter.format(payment.paidAt) : null],
    [
      "Diperiksa",
      payment.reviewedAt
        ? `${dateTimeFormatter.format(payment.reviewedAt)}${payment.reviewedBy ? ` oleh ${payment.reviewedBy.name}` : ""}`
        : null,
    ],
    ["Catatan pemeriksa", payment.reviewNote],
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Pembayaran {payment.reference}
            <Badge variant={statusBadgeVariants[status]}>
              {paymentStatusLabels[status]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Cocokkan nominal dan nama pengirim dengan mutasi rekening atau
            riwayat transaksi QRIS sebelum menyetujui.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <dl className="divide-border divide-y rounded-lg border text-sm">
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex gap-4 px-3 py-2">
                  <dt className="text-muted-foreground w-32 shrink-0 text-xs leading-5">
                    {label}
                  </dt>
                  <dd className="min-w-0 flex-1 break-words">{value}</dd>
                </div>
              ))}
          </dl>
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Bukti pembayaran</p>
            {!payment.hasProof ? (
              <div className="bg-muted/40 text-muted-foreground flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center text-xs">
                <ImageIcon className="size-5" />
                Siswa belum mengunggah bukti.
              </div>
            ) : proof.data ? (
              <a
                href={proof.data.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-[3/4] overflow-hidden rounded-lg border"
              >
                <Image
                  src={proof.data.url}
                  alt={`Bukti pembayaran ${payment.reference}`}
                  fill
                  unoptimized
                  sizes="14rem"
                  className="bg-muted object-contain"
                />
                <span
                  className={cn(
                    buttonVariants({ size: "sm", variant: "secondary" }),
                    "absolute right-2 bottom-2 opacity-90",
                  )}
                >
                  <ExternalLinkIcon />
                  Buka
                </span>
              </a>
            ) : proof.error ? (
              <p className="text-destructive text-xs">{proof.error.message}</p>
            ) : (
              <Skeleton className="aspect-[3/4] rounded-lg" />
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {canTransitionPayment(status, "CANCELLED") ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => void cancelPayment()}
              >
                Batalkan
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {status === "PAID" ? (
              <Button
                variant="outline"
                className="text-destructive"
                disabled={pending}
                onClick={() => void rejectPayment(true)}
              >
                <Undo2Icon />
                Batalkan persetujuan
              </Button>
            ) : null}
            {status !== "PAID" && canTransitionPayment(status, "REJECTED") ? (
              <Button
                variant="outline"
                className="text-destructive"
                disabled={pending}
                onClick={() => void rejectPayment(false)}
              >
                <XIcon />
                Tolak
              </Button>
            ) : null}
            {canTransitionPayment(status, "PAID") ? (
              <Button disabled={pending} onClick={() => void approvePayment()}>
                {approve.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <CheckIcon />
                )}
                {status === "SUBMITTED" ? "Setujui" : "Tandai lunas"}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
        {dialogs}
      </DialogContent>
    </Dialog>
  );
}
