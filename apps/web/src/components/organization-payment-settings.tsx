"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  CreditCardIcon,
  ImageUpIcon,
  LandmarkIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "~/components/ui/page-header";
import { BankBadge } from "~/components/payments/bank-badge";
import { BankPicker } from "~/components/payments/bank-picker";
import { decodeQrImage } from "~/components/payments/decode-qr-image";
import { QrisCode } from "~/components/payments/qris-code";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { useDialogs } from "~/components/ui/use-dialogs";
import { OTHER_BANK_CODE } from "~/lib/payments/banks";
import { api, type RouterOutputs } from "~/trpc/react";

type Settings = RouterOutputs["payment"]["getSettings"];
type BankAccount = Settings["bankAccounts"][number];

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

export function OrganizationPaymentSettings({
  organizationId,
}: {
  organizationId: string;
}) {
  const settings = api.payment.getSettings.useQuery({ organizationId });

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="Penerimaan pembayaran"
        title="Pembayaran"
        description="Siswa membayar Group belajar berbayar ke QRIS atau rekening di bawah ini. Pengelola Group belajar memeriksa setiap pembayaran secara manual sebelum siswa mendapat akses."
      />

      {settings.error ? (
        <Card>
          <CardContent className="flex items-center gap-3">
            <p className="text-destructive text-sm">{settings.error.message}</p>
            <Button variant="outline" onClick={() => settings.refetch()}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : settings.isPending ? (
        <>
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </>
      ) : (
        <>
          <QrisCard organizationId={organizationId} qris={settings.data.qris} />
          <BankAccountsCard
            organizationId={organizationId}
            accounts={settings.data.bankAccounts}
          />
        </>
      )}
    </div>
  );
}

function QrisCard({
  organizationId,
  qris,
}: {
  organizationId: string;
  qris: Settings["qris"];
}) {
  const utils = api.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [decoding, setDecoding] = useState(false);
  const save = api.payment.saveQris.useMutation();
  const setEnabled = api.payment.setQrisEnabled.useMutation();
  const remove = api.payment.removeQris.useMutation();
  const { confirm, dialogs } = useDialogs();
  const busy = decoding || save.isPending || remove.isPending;

  async function refresh() {
    await utils.payment.getSettings.invalidate({ organizationId });
  }

  async function upload(file: File) {
    setDecoding(true);
    try {
      const payload = await decodeQrImage(file);
      const saved = await save.mutateAsync({ organizationId, payload });
      await refresh();
      toast.success(`QRIS ${saved.merchantName} disimpan.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDecoding(false);
    }
  }

  async function toggle(enabled: boolean) {
    try {
      await setEnabled.mutateAsync({ organizationId, enabled });
      await refresh();
      toast.success(enabled ? "QRIS diaktifkan." : "QRIS dinonaktifkan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeQris() {
    const confirmed = await confirm({
      title: "Hapus QRIS?",
      description:
        "Siswa tidak bisa lagi memilih QRIS. Pembayaran yang sudah dibuat tetap memakai QRIS lama.",
      confirmLabel: "Hapus QRIS",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync({ organizationId });
      await refresh();
      toast.success("QRIS dihapus.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const pickFile = () => inputRef.current?.click();

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl shadow-sm">
              <QrCodeIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>QRIS</CardTitle>
                {qris ? (
                  <Badge variant={qris.enabled ? "secondary" : "outline"}>
                    {qris.enabled ? "Aktif" : "Nonaktif"}
                  </Badge>
                ) : null}
              </div>
              <CardDescription>
                Unggah QRIS statis merchant. Setiap pembayaran memakai QRIS
                dinamis dengan nominal yang sudah terisi.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        {qris ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <QrisCode
              payload={qris.payload}
              label={`QRIS ${qris.merchantName}`}
              className="size-36 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Merchant</dt>
                  <dd className="font-medium">{qris.merchantName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Kota</dt>
                  <dd className="font-medium">{qris.merchantCity}</dd>
                </div>
              </dl>
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={qris.enabled}
                  disabled={setEnabled.isPending}
                  onCheckedChange={(checked) => void toggle(checked)}
                />
                Tampilkan QRIS saat checkout
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={pickFile}>
                  {decoding || save.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <ImageUpIcon />
                  )}
                  Ganti QRIS
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void removeQris()}
                >
                  <Trash2Icon />
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            size="sm"
            icon={QrCodeIcon}
            title="Belum ada QRIS"
            description="Unggah foto atau screenshot QRIS statis dari bank atau aplikasi merchant kamu."
            action={
              <Button className="mt-4" disabled={busy} onClick={pickFile}>
                {busy ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <ImageUpIcon />
                )}
                Unggah QRIS
              </Button>
            }
          />
        )}
      </CardContent>
      {dialogs}
    </Card>
  );
}

function BankAccountsCard({
  organizationId,
  accounts,
}: {
  organizationId: string;
  accounts: BankAccount[];
}) {
  const utils = api.useUtils();
  const update = api.payment.updateBankAccount.useMutation();
  const remove = api.payment.deleteBankAccount.useMutation();
  const { confirm, dialogs } = useDialogs();
  const [editing, setEditing] = useState<BankAccount | "new" | null>(null);

  async function refresh() {
    await utils.payment.getSettings.invalidate({ organizationId });
  }

  async function toggle(account: BankAccount, enabled: boolean) {
    try {
      await update.mutateAsync({
        organizationId,
        bankAccountId: account.id,
        enabled,
      });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeAccount(account: BankAccount) {
    const confirmed = await confirm({
      title: `Hapus rekening ${account.bankName}?`,
      description:
        "Rekening ini tidak lagi ditampilkan saat checkout. Pembayaran yang sudah dibuat tidak berubah.",
      confirmLabel: "Hapus rekening",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync({ organizationId, bankAccountId: account.id });
      await refresh();
      toast.success("Rekening dihapus.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl shadow-sm">
              <LandmarkIcon className="size-5" />
            </div>
            <div>
              <CardTitle>Rekening bank</CardTitle>
              <CardDescription>
                Siswa yang memilih transfer bank melihat semua rekening aktif.
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            Tambah rekening
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <EmptyState
            size="sm"
            icon={CreditCardIcon}
            title="Belum ada rekening"
            description="Tambahkan rekening bank untuk menerima transfer dari siswa."
          />
        ) : (
          <ul className="divide-border -my-2 divide-y">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
              >
                <BankBadge
                  bankCode={account.bankCode}
                  bankName={account.bankName}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {account.bankName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="text-foreground font-mono tabular-nums">
                      {account.accountNumber}
                    </span>{" "}
                    · a.n. {account.accountHolder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-muted-foreground mr-2 flex items-center gap-2 text-xs">
                    <Switch
                      size="sm"
                      checked={account.enabled}
                      disabled={update.isPending}
                      onCheckedChange={(checked) =>
                        void toggle(account, checked)
                      }
                    />
                    {account.enabled ? "Aktif" : "Nonaktif"}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ubah rekening ${account.bankName}`}
                    onClick={() => setEditing(account)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label={`Hapus rekening ${account.bankName}`}
                    disabled={remove.isPending}
                    onClick={() => void removeAccount(account)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {editing ? (
        <BankAccountDialog
          organizationId={organizationId}
          account={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}
      {dialogs}
    </Card>
  );
}

function BankAccountDialog({
  organizationId,
  account,
  onClose,
  onSaved,
}: {
  organizationId: string;
  account: BankAccount | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const create = api.payment.createBankAccount.useMutation();
  const update = api.payment.updateBankAccount.useMutation();
  const [bankCode, setBankCode] = useState(account?.bankCode ?? "");
  const [bankName, setBankName] = useState(
    account?.bankCode === OTHER_BANK_CODE ? account.bankName : "",
  );
  const [accountNumber, setAccountNumber] = useState(
    account?.accountNumber ?? "",
  );
  const [accountHolder, setAccountHolder] = useState(
    account?.accountHolder ?? "",
  );
  const pending = create.isPending || update.isPending;
  const isOther = bankCode === OTHER_BANK_CODE;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bankCode) {
      toast.error("Pilih bank terlebih dahulu.");
      return;
    }
    const values = {
      organizationId,
      bankCode,
      bankName: isOther ? bankName.trim() : null,
      accountNumber,
      accountHolder: accountHolder.trim(),
    };
    try {
      if (account) {
        await update.mutateAsync({ ...values, bankAccountId: account.id });
      } else {
        await create.mutateAsync(values);
      }
      await onSaved();
      toast.success(account ? "Rekening diperbarui." : "Rekening ditambahkan.");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>
              {account ? "Ubah rekening" : "Tambah rekening"}
            </DialogTitle>
            <DialogDescription>
              Pastikan nama pemilik sesuai buku tabungan agar siswa yakin
              mentransfer ke rekening yang benar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank-account-bank">Bank</Label>
              <BankPicker
                id="bank-account-bank"
                value={bankCode}
                onChange={setBankCode}
                disabled={pending}
              />
            </div>
            {isOther ? (
              <div className="space-y-2">
                <Label htmlFor="bank-account-name">Nama bank</Label>
                <Input
                  id="bank-account-name"
                  required
                  maxLength={120}
                  placeholder="Contoh: BPR Sejahtera"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="bank-account-number">Nomor rekening</Label>
              <Input
                id="bank-account-number"
                required
                inputMode="numeric"
                autoComplete="off"
                placeholder="1234567890"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-account-holder">Nama pemilik rekening</Label>
              <Input
                id="bank-account-holder"
                required
                minLength={2}
                maxLength={120}
                value={accountHolder}
                onChange={(event) => setAccountHolder(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              Simpan rekening
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
