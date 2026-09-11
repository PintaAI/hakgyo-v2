"use client";

import { BellOffIcon, BellRingIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { usePush } from "~/components/notifications/use-push";

/**
 * Per-browser push opt-in. Permission is requested only from the subscribe
 * click (browsers suppress non-gesture prompts, and a denied permission can
 * never be re-prompted — the user must then use site settings).
 */
export function PushSettingsCard() {
  const {
    support,
    subscribed,
    busy,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    sendTestPending,
  } = usePush();
  const [testing, setTesting] = useState(false);

  const onSubscribe = async () => {
    try {
      await subscribe();
      toast.success("Notifikasi push aktif di perangkat ini");
    } catch {
      // Error text is already surfaced below the button.
    }
  };

  const onUnsubscribe = async () => {
    try {
      await unsubscribe();
      toast.success("Notifikasi push dimatikan di perangkat ini");
    } catch {
      // Error text is already surfaced below the button.
    }
  };

  const onSendTest = async () => {
    setTesting(true);
    try {
      await sendTest();
      toast.success("Notifikasi percobaan dikirim ke perangkatmu");
    } catch {
      toast.error("Gagal mengirim notifikasi percobaan");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifikasi push</CardTitle>
        <CardDescription>
          Terima pengingat nilai, jadwal kelas, dan pengumuman bahkan saat
          browser tertutup. Berlaku untuk perangkat ini saja.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {support === "loading" ? (
          <p className="text-muted-foreground text-sm">
            Memeriksa dukungan browser…
          </p>
        ) : null}
        {support === "unsupported" ? (
          <p className="text-muted-foreground text-sm">
            Browser ini tidak mendukung notifikasi push. Gunakan Chrome, Edge,
            Firefox, atau Safari terbaru.
          </p>
        ) : null}
        {support === "needs-install" ? (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Di iPhone/iPad, pasang dulu ke layar utama:</p>
            <ol className="text-muted-foreground mt-1 list-decimal space-y-0.5 pl-5">
              <li>Buka situs ini di Safari</li>
              <li>Ketuk tombol Bagikan, lalu “Add to Home Screen”</li>
              <li>Buka aplikasinya dari ikon layar utama, lalu aktifkan di sini</li>
            </ol>
          </div>
        ) : null}
        {support === "supported" ? (
          <div className="flex flex-wrap items-center gap-2">
            {subscribed ? (
              <Button
                variant="outline"
                onClick={onUnsubscribe}
                disabled={busy}
              >
                <BellOffIcon />
                Matikan di perangkat ini
              </Button>
            ) : (
              <Button onClick={onSubscribe} disabled={busy}>
                <BellRingIcon />
                Aktifkan notifikasi
              </Button>
            )}
            {subscribed ? (
              <Button
                variant="secondary"
                onClick={onSendTest}
                disabled={testing || sendTestPending}
              >
                <SendIcon />
                Kirim percobaan
              </Button>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
