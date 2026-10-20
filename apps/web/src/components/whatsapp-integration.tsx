"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  QrCodeIcon,
  TriangleAlertIcon,
  UnplugIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
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
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { formatWhatsappNumber } from "~/lib/whatsapp";
import { api } from "~/trpc/react";

/** The QR dialog asks the server for progress this often, for this long. */
const PAIRING_POLL_MS = 4_000;
const PAIRING_TIMEOUT_MS = 2 * 60_000;

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Terjadi kesalahan. Silakan coba lagi.";
}

const statusLabels = {
  PENDING: "Menunggu scan",
  CONNECTED: "Terhubung",
  DISCONNECTED: "Terputus",
} as const;

export function WhatsappIntegration({
  organizationId,
}: {
  organizationId: string;
}) {
  const utils = api.useUtils();
  const query = api.whatsapp.getConnection.useQuery({ organizationId });
  const connect = api.whatsapp.connect.useMutation();
  const disconnect = api.whatsapp.disconnect.useMutation();
  const updateSettings = api.whatsapp.updateSettings.useMutation();
  const [pairing, setPairing] = useState<{
    qrBase64: string | null;
    pairingCode: string | null;
    startedAt: number;
  } | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [participant, setParticipant] = useState<string | null>(null);

  const connection = query.data?.connection ?? null;
  const savedParticipant = connection?.initialParticipantPhone
    ? formatWhatsappNumber(connection.initialParticipantPhone)
    : "";
  const participantValue = participant ?? savedParticipant;

  async function refresh() {
    await utils.whatsapp.getConnection.invalidate({ organizationId });
    await utils.whatsapp.getCohortStatus.invalidate();
  }

  async function startPairing() {
    try {
      const result = await connect.mutateAsync({ organizationId });
      setPairing({ ...result, startedAt: Date.now() });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync({ organizationId });
      setDisconnectOpen(false);
      setPairing(null);
      await refresh();
      toast.success("Nomor WhatsApp diputus.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function saveSettings(input: {
    autoCreateGroups?: boolean;
    initialParticipantPhone?: string | null;
  }) {
    try {
      await updateSettings.mutateAsync({ organizationId, ...input });
      await refresh();
      if (input.initialParticipantPhone !== undefined) setParticipant(null);
      toast.success("Pengaturan WhatsApp disimpan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  // Hidden until the server has an Evolution API configured.
  if (query.data && !query.data.enabled) return null;

  const status = connection?.status ?? null;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <MessageCircleIcon className="size-5" />
            </div>
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Grup kelas dan pengingat</CardDescription>
            </div>
          </div>
          {query.isPending ? (
            <Badge variant="outline">Memeriksa</Badge>
          ) : (
            <Badge variant={status === "CONNECTED" ? "default" : "secondary"}>
              {status ? statusLabels[status] : "Belum terhubung"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {query.isPending ? (
          <div className="text-muted-foreground flex min-h-28 items-center justify-center text-sm">
            <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
            Memeriksa koneksi
          </div>
        ) : query.error ? (
          <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-center">
            <p className="text-destructive text-sm">{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            {status === "CONNECTED" && connection ? (
              <>
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Nomor terhubung
                    </p>
                    <p className="mt-1 font-medium tabular-nums">
                      {connection.phone
                        ? formatWhatsappNumber(connection.phone)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Dihubungkan oleh
                    </p>
                    <p className="mt-1 font-medium">
                      {connection.connectedBy.user.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 border-t pt-4">
                  <div>
                    <Label htmlFor="whatsapp-auto-create">
                      Buat grup otomatis saat kelas dibuka
                    </Label>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Kelas yang berstatus Dibuka dan belum punya link grup
                      mendapat grup WhatsApp dengan nama kelas dan foto
                      kurikulumnya.
                    </p>
                  </div>
                  <Switch
                    id="whatsapp-auto-create"
                    checked={connection.autoCreateGroups}
                    disabled={updateSettings.isPending}
                    onCheckedChange={(checked) =>
                      void saveSettings({ autoCreateGroups: checked })
                    }
                  />
                </div>

                <form
                  className="grid gap-2 border-t pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveSettings({
                      initialParticipantPhone: participantValue.trim() || null,
                    });
                  }}
                >
                  <Label htmlFor="whatsapp-initial-participant">
                    Nomor peserta awal
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    WhatsApp membutuhkan satu peserta selain nomor organisasi
                    saat membuat grup, misalnya nomor pengajar. Nomor ini ikut
                    masuk ke setiap grup baru.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="whatsapp-initial-participant"
                      inputMode="tel"
                      placeholder="0812 3456 7890"
                      value={participantValue}
                      onChange={(event) => setParticipant(event.target.value)}
                      className="sm:max-w-xs"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={
                        updateSettings.isPending ||
                        participantValue.trim() === savedParticipant
                      }
                    >
                      <CheckIcon />
                      Simpan nomor
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div>
                <p className="font-medium">
                  {status === "DISCONNECTED"
                    ? "Nomor WhatsApp terputus"
                    : status === "PENDING"
                      ? "Selesaikan scan QR"
                      : "Grup WhatsApp untuk setiap kelas"}
                </p>
                <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                  {status === "DISCONNECTED"
                    ? "Ponsel melepas perangkat tertaut atau sesi berakhir. Pesan ke grup ditahan sampai nomor dihubungkan lagi."
                    : "Hubungkan nomor WhatsApp lembaga dengan scan QR. Hakgyo dapat membuat grup kelas dengan nama dan foto kelas, lalu mengirim pengingat meeting dan jadwal Latihan/Tryout ke grup itu."}
                </p>
              </div>
            )}

            {status !== "CONNECTED" ? (
              <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p>
                  Koneksi ini memakai WhatsApp Web, bukan API resmi WhatsApp.
                  WhatsApp dapat membatasi atau memblokir nomor yang dipakai.
                  Gunakan nomor khusus lembaga, bukan nomor pribadi.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">
                Koneksi WhatsApp memakai Evolution API.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {status !== "CONNECTED" ? (
                  <Button
                    disabled={connect.isPending}
                    onClick={() => void startPairing()}
                  >
                    {connect.isPending ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <QrCodeIcon />
                    )}
                    {status === "PENDING"
                      ? "Tampilkan QR"
                      : status === "DISCONNECTED"
                        ? "Hubungkan ulang"
                        : "Hubungkan WhatsApp"}
                  </Button>
                ) : null}
                {connection ? (
                  <Button
                    variant={status === "CONNECTED" ? "destructive" : "outline"}
                    onClick={() => setDisconnectOpen(true)}
                  >
                    <UnplugIcon />
                    {status === "PENDING" ? "Batalkan" : "Putuskan koneksi"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <PairingDialog
        organizationId={organizationId}
        pairing={pairing}
        onRetry={() => void startPairing()}
        retrying={connect.isPending}
        onClose={() => setPairing(null)}
        onConnected={async () => {
          setPairing(null);
          await refresh();
          toast.success("Nomor WhatsApp terhubung.");
        }}
      />

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UnplugIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Putuskan nomor WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Hakgyo berhenti membuat grup dan mengirim pesan, dan pesan yang
              masih antre dibatalkan. Grup yang sudah ada tetap ada di WhatsApp,
              dan link grupnya tetap tampil untuk murid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnect.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => void handleDisconnect()}
            >
              {disconnect.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <UnplugIcon />
              )}
              Putuskan koneksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/**
 * Shows the QR code and asks the server for progress while open: the scan
 * happens on the phone, so nothing in the browser signals it. Stops after two
 * minutes and offers a new code.
 */
function PairingDialog({
  organizationId,
  pairing,
  onRetry,
  retrying,
  onClose,
  onConnected,
}: {
  organizationId: string;
  pairing: {
    qrBase64: string | null;
    pairingCode: string | null;
    startedAt: number;
  } | null;
  onRetry: () => void;
  retrying: boolean;
  onClose: () => void;
  onConnected: () => Promise<void>;
}) {
  const [now, setNow] = useState(() => Date.now());
  const open = pairing !== null;
  const timedOut = pairing
    ? now - pairing.startedAt > PAIRING_TIMEOUT_MS
    : false;
  const progress = api.whatsapp.getPairing.useQuery(
    { organizationId },
    {
      enabled: open && !timedOut,
      refetchInterval: open && !timedOut ? PAIRING_POLL_MS : false,
      staleTime: 0,
      retry: false,
    },
  );

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, [open]);

  const connected = progress.data?.status === "CONNECTED";
  const reported = useRef<number | null>(null);
  useEffect(() => {
    // Once per pairing session, however often the dialog re-renders.
    if (!pairing || !connected || reported.current === pairing.startedAt) {
      return;
    }
    reported.current = pairing.startedAt;
    void onConnected();
  }, [pairing, connected, onConnected]);

  const qr = progress.data?.qrBase64 ?? pairing?.qrBase64 ?? null;
  const qrSrc = qr
    ? qr.startsWith("data:")
      ? qr
      : `data:image/png;base64,${qr}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR dengan WhatsApp</DialogTitle>
          <DialogDescription>
            Di ponsel lembaga, buka WhatsApp › Perangkat tertaut › Tautkan
            perangkat, lalu arahkan kamera ke kode ini.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {timedOut ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center text-sm">
              <p className="text-muted-foreground">
                Kode QR sudah kedaluwarsa.
              </p>
              <Button disabled={retrying} onClick={onRetry}>
                {retrying ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <QrCodeIcon />
                )}
                Minta QR baru
              </Button>
            </div>
          ) : qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from the WhatsApp server
            <img
              src={qrSrc}
              alt="Kode QR WhatsApp"
              className="size-64 rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="text-muted-foreground flex size-64 items-center justify-center rounded-lg border text-sm">
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              Menyiapkan kode QR
            </div>
          )}
          {pairing?.pairingCode && !timedOut ? (
            <p className="text-muted-foreground text-center text-sm">
              Kode tautan:{" "}
              <span className="font-mono font-medium">
                {pairing.pairingCode}
              </span>
            </p>
          ) : null}
          {progress.error ? (
            <p className="text-destructive text-center text-sm">
              {progress.error.message}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
