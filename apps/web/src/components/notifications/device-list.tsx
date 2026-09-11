"use client";

import { LaptopIcon, SmartphoneIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

function platformLabel(platform: string): string {
  return platform === "expo" ? "Aplikasi" : "Browser";
}

function platformIcon(platform: string) {
  return platform === "expo" ? (
    <SmartphoneIcon className="size-4" />
  ) : (
    <LaptopIcon className="size-4" />
  );
}

/**
 * Every browser/app the user enabled notifications on, with per-device
 * revoke. Use this after losing a phone or using a shared computer.
 */
export function DeviceList() {
  const utils = api.useUtils();
  const devicesQuery = api.notification.listDevices.useQuery();
  const revokeMutation = api.notification.revokeDevice.useMutation({
    onSettled: () => {
      void utils.notification.listDevices.invalidate();
    },
  });

  const onRevoke = async (id: string, name: string) => {
    try {
      const result = await revokeMutation.mutateAsync({ id });
      if (result.revoked) {
        toast.success(`Perangkat “${name}” dihapus`);
      } else {
        toast.error("Perangkat tidak ditemukan");
      }
    } catch {
      toast.error("Gagal menghapus perangkat");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perangkat terdaftar</CardTitle>
        <CardDescription>
          Setiap browser dan HP yang menerima notifikasi akun ini. Keluar
          (logout) hanya menonaktifkan perangkat itu saja.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {devicesQuery.isPending ? (
          <p className="text-muted-foreground text-sm">Memuat perangkat…</p>
        ) : null}
        {devicesQuery.error ? (
          <p className="text-destructive text-sm">Gagal memuat perangkat.</p>
        ) : null}
        {devicesQuery.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada perangkat. Aktifkan notifikasi di browser atau HP untuk
            mendaftarkannya di sini.
          </p>
        ) : null}
        {devicesQuery.data?.map((device) => {
          const name =
            device.deviceName ??
            (device.os
              ? `${platformLabel(device.platform)} · ${device.os}`
              : platformLabel(device.platform));
          const active = !device.disabledAt;
          return (
            <div
              key={device.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
            >
              {platformIcon(device.platform)}
              <div className="grid min-w-0 flex-1 text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  Terakhir aktif{" "}
                  {new Date(device.lastSeenAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {device.appVersion ? ` · v${device.appVersion}` : null}
                </span>
              </div>
              {active ? (
                <Badge variant="secondary">Aktif</Badge>
              ) : (
                <Badge variant="outline">Nonaktif</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus ${name}`}
                onClick={() => onRevoke(device.id, name)}
                disabled={revokeMutation.isPending}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
