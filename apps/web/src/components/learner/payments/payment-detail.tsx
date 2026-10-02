"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  ImageUpIcon,
  LoaderCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { BankBadge } from "~/components/payments/bank-badge";
import { QrisCode } from "~/components/payments/qris-code";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CopyButton } from "~/components/ui/copy-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useDialogs } from "~/components/ui/use-dialogs";
import {
  formatRupiah,
  MAX_PAYMENT_PROOF_SIZE,
  paymentMethodLabels,
  paymentProofContentTypes,
  paymentStatusLabels,
  type PaymentProofContentType,
} from "~/lib/payments/payment";
import { api, type RouterOutputs } from "~/trpc/react";

type Payment = RouterOutputs["payment"]["get"];

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export function PaymentDetail({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const payment = api.payment.get.useQuery({ paymentId }, { retry: false });
  const cancel = api.payment.cancel.useMutation();
  const { confirm, dialogs } = useDialogs();

  if (payment.error) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-10 text-center">
          <p className="font-medium">Pembayaran tidak ditemukan</p>
          <Link
            href="/learn/payments"
            className={buttonVariants({
              variant: "outline",
              className: "mt-4",
            })}
          >
            Lihat semua pembayaran
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (!payment.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const data = payment.data;
  const canPay = data.status === "PENDING" || data.status === "SUBMITTED";
  const canSubmitProof = canPay || data.status === "REJECTED";
  const checkoutHref = `/learn/checkout/${data.cohort.id}`;

  async function cancelPayment() {
    const confirmed = await confirm({
      title: "Batalkan pembayaran ini?",
      description:
        "Batalkan jika kamu belum membayar atau ingin memakai metode lain. Kamu bisa checkout ulang kapan saja.",
      confirmLabel: "Batalkan pembayaran",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await cancel.mutateAsync({ paymentId });
      await utils.payment.invalidate();
      toast.success("Pembayaran dibatalkan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm">
                {data.organization.name} · {data.cohort.course.title}
              </p>
              <h1 className="font-heading mt-1 text-2xl font-medium tracking-tight">
                {data.cohort.name}
              </h1>
            </div>
            <Badge
              variant={
                data.status === "PAID"
                  ? "secondary"
                  : data.status === "REJECTED"
                    ? "destructive"
                    : "outline"
              }
            >
              {paymentStatusLabels[data.status]}
            </Badge>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">Total</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums">
                {formatRupiah(data.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Kode pembayaran</dt>
              <dd className="font-mono font-medium">{data.reference}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Metode</dt>
              <dd className="font-medium">
                {paymentMethodLabels[data.method]}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <StatusNotice payment={data} checkoutHref={checkoutHref} />

      {canPay ? <Instructions payment={data} /> : null}

      {canSubmitProof ? (
        <ProofForm
          payment={data}
          onSubmitted={async () => {
            await utils.payment.invalidate();
            router.refresh();
          }}
        />
      ) : null}

      {canPay ? (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            disabled={cancel.isPending}
            onClick={() => void cancelPayment()}
          >
            Batalkan pembayaran
          </Button>
        </div>
      ) : null}
      {dialogs}
    </div>
  );
}

function StatusNotice({
  payment,
  checkoutHref,
}: {
  payment: Payment;
  checkoutHref: string;
}) {
  if (payment.status === "PAID") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <CheckCircle2Icon className="text-primary size-6 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Pembayaran dikonfirmasi</p>
            <p className="text-muted-foreground text-sm">
              Kamu sudah terdaftar di {payment.cohort.name}
              {payment.paidAt
                ? ` sejak ${dateTimeFormatter.format(payment.paidAt)}`
                : ""}
              .
            </p>
          </div>
          <Link
            href={`/learn/${payment.cohort.course.id}`}
            className={buttonVariants()}
          >
            Mulai belajar
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (payment.status === "SUBMITTED") {
    return (
      <Card>
        <CardContent className="flex items-start gap-3">
          <ClockIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Menunggu verifikasi penyelenggara</p>
            <p className="text-muted-foreground text-sm">
              Bukti dikirim
              {payment.submittedAt
                ? ` ${dateTimeFormatter.format(payment.submittedAt)}`
                : ""}
              . Kamu akan mendapat notifikasi setelah pembayaran diperiksa.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (payment.status === "REJECTED") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex items-start gap-3">
          <XCircleIcon className="text-destructive mt-0.5 size-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Pembayaran ditolak</p>
            {payment.reviewNote ? (
              <p className="text-sm">Alasan: {payment.reviewNote}</p>
            ) : null}
            <p className="text-muted-foreground text-sm">
              Jika kamu sudah membayar, unggah bukti yang benar di bawah. Jika
              belum, hubungi penyelenggara.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (payment.status === "CANCELLED" || payment.status === "EXPIRED") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-medium">
              Pembayaran {paymentStatusLabels[payment.status].toLowerCase()}
            </p>
            {payment.reviewNote ? (
              <p className="text-muted-foreground text-sm">
                {payment.reviewNote}
              </p>
            ) : null}
          </div>
          <Link
            href={checkoutHref}
            className={buttonVariants({ variant: "outline" })}
          >
            Checkout ulang
          </Link>
        </CardContent>
      </Card>
    );
  }
  return null;
}

function Instructions({ payment }: { payment: Payment }) {
  const instructions = payment.instructions;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cara membayar</CardTitle>
        <CardDescription>
          {instructions.kind === "QRIS"
            ? "Scan kode QRIS dengan aplikasi m-banking atau e-wallet. Nominal sudah terisi otomatis."
            : `Transfer tepat ${formatRupiah(payment.amount)} ke salah satu rekening berikut dan tulis kode ${payment.reference} di berita transfer.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {instructions.kind === "QRIS" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <QrisCode
              payload={instructions.payload}
              label={`QRIS ${instructions.merchantName} sebesar ${formatRupiah(payment.amount)}`}
              className="size-64 max-w-full"
            />
            <div>
              <p className="font-medium">{instructions.merchantName}</p>
              <p className="text-muted-foreground text-sm">
                {instructions.merchantCity}
              </p>
            </div>
            <p className="text-muted-foreground max-w-sm text-xs">
              Pastikan nama merchant dan nominal {formatRupiah(payment.amount)}{" "}
              sesuai sebelum membayar, lalu simpan screenshot bukti pembayaran.
            </p>
          </div>
        ) : (
          <ul className="divide-border divide-y rounded-lg border">
            {instructions.accounts.map((account) => (
              <li
                key={`${account.bankCode}-${account.accountNumber}`}
                className="flex flex-wrap items-center gap-3 p-3"
              >
                <BankBadge
                  bankCode={account.bankCode}
                  bankName={account.bankName}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs">
                    {account.bankName}
                  </p>
                  <p className="font-mono text-lg font-medium tabular-nums">
                    {account.accountNumber}
                  </p>
                  <p className="text-sm">a.n. {account.accountHolder}</p>
                </div>
                <CopyButton
                  value={account.accountNumber}
                  label="Nomor rekening"
                />
              </li>
            ))}
            <li className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">Nominal</p>
                <p className="font-medium tabular-nums">
                  {formatRupiah(payment.amount)}
                </p>
              </div>
              <CopyButton value={String(payment.amount)} label="Nominal" />
            </li>
            <li className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">Berita transfer</p>
                <p className="font-mono font-medium">{payment.reference}</p>
              </div>
              <CopyButton value={payment.reference} label="Kode pembayaran" />
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProofForm({
  payment,
  onSubmitted,
}: {
  payment: Payment;
  onSubmitted: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [payerName, setPayerName] = useState(payment.payerName ?? "");
  const [payerNote, setPayerNote] = useState(payment.payerNote ?? "");
  const [uploading, setUploading] = useState(false);
  const createUpload = api.payment.createProofUpload.useMutation();
  const submitProof = api.payment.submitProof.useMutation();
  const replacing = payment.status === "SUBMITTED";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Pilih gambar bukti pembayaran.");
      return;
    }
    if (
      !paymentProofContentTypes.includes(file.type as PaymentProofContentType)
    ) {
      toast.error("Gunakan gambar JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > MAX_PAYMENT_PROOF_SIZE) {
      toast.error("Ukuran gambar maksimal 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const upload = await createUpload.mutateAsync({
        paymentId: payment.id,
        contentType: file.type as PaymentProofContentType,
        fileSize: file.size,
      });
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        body: file,
        headers: upload.headers,
      });
      if (!response.ok) {
        throw new Error(`Gagal mengunggah bukti (${response.status}).`);
      }
      await submitProof.mutateAsync({
        paymentId: payment.id,
        key: upload.key,
        payerName: payerName.trim() || undefined,
        payerNote: payerNote.trim() || undefined,
      });
      setFile(null);
      await onSubmitted();
      toast.success("Bukti pembayaran terkirim.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {replacing ? "Ganti bukti pembayaran" : "Kirim bukti pembayaran"}
        </CardTitle>
        <CardDescription>
          Unggah screenshot atau foto struk yang menampilkan nominal dan waktu
          transaksi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={paymentProofContentTypes.join(",")}
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <ImageUpIcon />
            <span className="truncate">
              {file ? file.name : "Pilih gambar bukti pembayaran"}
            </span>
          </Button>
          <div className="space-y-2">
            <Label htmlFor="payment-payer-name">
              Nama pemilik rekening/e-wallet pengirim
            </Label>
            <Input
              id="payment-payer-name"
              maxLength={120}
              placeholder="Opsional, membantu penyelenggara mencocokkan"
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-payer-note">Catatan</Label>
            <Textarea
              id="payment-payer-note"
              maxLength={1000}
              placeholder="Opsional"
              value={payerNote}
              onChange={(event) => setPayerNote(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={uploading || !file}
          >
            {uploading ? <LoaderCircleIcon className="animate-spin" /> : null}
            {replacing ? "Kirim bukti baru" : "Saya sudah bayar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
