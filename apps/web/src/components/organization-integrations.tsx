"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  UnplugIcon,
  VideoIcon,
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
import { PageHeader } from "~/components/ui/page-header";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

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

export function OrganizationIntegrations({
  organizationId,
}: {
  organizationId: string;
}) {
  const utils = api.useUtils();
  const meetingProvider = api.organization.getMeetingProvider.useQuery({
    organizationId,
  });
  const updateMeetingProvider =
    api.organization.updateMeetingProvider.useMutation();
  const connection = api.organization.getZoomConnectionStatus.useQuery({
    organizationId,
  });
  const disconnect = api.organization.disconnectZoom.useMutation();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const googleConnection =
    api.organization.getGoogleMeetConnectionStatus.useQuery({ organizationId });
  const disconnectGoogle = api.organization.disconnectGoogleMeet.useMutation();
  const [disconnectGoogleOpen, setDisconnectGoogleOpen] = useState(false);

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync({ organizationId });
      await utils.organization.getZoomConnectionStatus.invalidate({
        organizationId,
      });
      await utils.cohort.getMeetingIntegrationStatus.invalidate();
      setDisconnectOpen(false);
      toast.success("Zoom dicabut tautannya.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleGoogleDisconnect() {
    try {
      await disconnectGoogle.mutateAsync({ organizationId });
      await utils.organization.getGoogleMeetConnectionStatus.invalidate({
        organizationId,
      });
      await utils.cohort.getMeetingIntegrationStatus.invalidate();
      setDisconnectGoogleOpen(false);
      toast.success("Google Meet dicabut tautannya.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const zoom = connection.data;
  const isConnected = zoom?.status === "CONNECTED";
  const google = googleConnection.data;
  const googleConnected = google?.status === "CONNECTED";

  async function selectMeetingProvider(value: "ZOOM" | "GOOGLE_MEET") {
    try {
      await updateMeetingProvider.mutateAsync({
        organizationId,
        meetingProvider: value,
      });
      await Promise.all([
        utils.organization.getMeetingProvider.invalidate({ organizationId }),
        utils.cohort.getMeetingIntegrationStatus.invalidate(),
      ]);
      toast.success("Layanan meeting utama diperbarui.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="Layanan terhubung"
        title="Integrasi"
        description="Hubungkan layanan eksternal yang dipakai untuk menjalankan pengalaman belajar langsung."
      />

      <Card>
        <CardHeader>
          <CardTitle>Layanan meeting utama</CardTitle>
          <CardDescription>
            Meeting baru akan menggunakan layanan ini. Meeting yang sudah
            dijadwalkan tetap menggunakan layanan asalnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetingProvider.error ? (
            <div className="flex items-center gap-3">
              <p className="text-destructive text-sm">
                {meetingProvider.error.message}
              </p>
              <Button
                variant="outline"
                onClick={() => meetingProvider.refetch()}
              >
                Coba lagi
              </Button>
            </div>
          ) : (
            <Select
              value={meetingProvider.data?.meetingProvider ?? "ZOOM"}
              disabled={
                meetingProvider.isPending || updateMeetingProvider.isPending
              }
              onValueChange={(value) => {
                if (value === "ZOOM" || value === "GOOGLE_MEET")
                  void selectMeetingProvider(value);
              }}
            >
              <SelectTrigger
                aria-label="Layanan meeting utama"
                className="w-full sm:w-64"
              >
                <span className="flex flex-1 text-left">
                  {meetingProvider.data?.meetingProvider === "GOOGLE_MEET"
                    ? "Google Meet"
                    : "Zoom"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ZOOM">Zoom</SelectItem>
                <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <VideoIcon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Zoom</CardTitle>
                  {meetingProvider.data?.meetingProvider === "ZOOM" ? (
                    <Badge variant="outline">Utama</Badge>
                  ) : null}
                </div>
                <CardDescription>Meeting kelas</CardDescription>
              </div>
            </div>
            {connection.isPending ? (
              <Badge variant="outline">Memeriksa</Badge>
            ) : (
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Terhubung" : "Belum terhubung"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {connection.isPending ? (
            <div className="text-muted-foreground flex min-h-32 items-center justify-center text-sm">
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              Memeriksa koneksi
            </div>
          ) : connection.error ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
              <p className="text-destructive text-sm">
                {connection.error.message}
              </p>
              <Button variant="outline" onClick={() => connection.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : zoom ? (
            <div className="grid gap-5">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Dihubungkan oleh
                  </p>
                  <p className="mt-1 font-medium">
                    {zoom.connectedBy.user.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    ID pengguna Zoom
                  </p>
                  <p className="mt-1 font-mono text-xs">{zoom.zoomUserId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Token berakhir
                  </p>
                  <p className="mt-1">
                    {zoom.accessTokenExpiresAt.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Status
                  </p>
                  <p className="mt-1 capitalize">{zoom.status.toLowerCase()}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                {!isConnected ? (
                  <a
                    href={`/api/integrations/zoom/connect?organizationId=${organizationId}`}
                    className={buttonVariants()}
                  >
                    <ExternalLinkIcon />
                    Hubungkan ulang Zoom
                  </a>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setDisconnectOpen(true)}
                  >
                    <UnplugIcon />
                    Putuskan koneksi
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-36 flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium">Buat meeting dari Hakgyo</p>
                <p className="text-muted-foreground mt-1 max-w-lg text-sm">
                  Otorisasi akun Zoom Anda untuk membuat, memperbarui, dan
                  membatalkan meeting kelas tanpa membagikan kredensial kepada
                  anggota.
                </p>
              </div>
              <a
                href={`/api/integrations/zoom/connect?organizationId=${organizationId}`}
                className={buttonVariants()}
              >
                <ExternalLinkIcon />
                Hubungkan Zoom
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                <VideoIcon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Google Meet</CardTitle>
                  {meetingProvider.data?.meetingProvider === "GOOGLE_MEET" ? (
                    <Badge variant="outline">Utama</Badge>
                  ) : null}
                </div>
                <CardDescription>
                  Meeting kelas melalui Google Calendar
                </CardDescription>
              </div>
            </div>
            <Badge variant={googleConnected ? "default" : "secondary"}>
              {googleConnection.isPending
                ? "Memeriksa"
                : googleConnected
                  ? "Terhubung"
                  : "Belum terhubung"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {googleConnection.isPending ? (
            <div className="text-muted-foreground flex min-h-28 items-center justify-center text-sm">
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" />{" "}
              Memeriksa koneksi
            </div>
          ) : googleConnection.error ? (
            <div className="flex min-h-28 flex-col items-center justify-center gap-3">
              <p className="text-destructive text-sm">
                {googleConnection.error.message}
              </p>
              <Button
                variant="outline"
                onClick={() => googleConnection.refetch()}
              >
                Coba lagi
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {google ? (
                  <>
                    <p className="font-medium">{google.email}</p>
                    <p className="text-muted-foreground mt-1">
                      Dihubungkan oleh {google.connectedBy.user.name} ·{" "}
                      {google.status.toLowerCase()}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">
                      Jadwalkan Google Meet dari Hakgyo
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Hubungkan kalender akun penyelenggara untuk membuat dan
                      mengelola meeting.
                    </p>
                  </>
                )}
              </div>
              {googleConnected ? (
                <Button
                  variant="destructive"
                  onClick={() => setDisconnectGoogleOpen(true)}
                >
                  <UnplugIcon /> Putuskan koneksi
                </Button>
              ) : (
                <a
                  href={`/api/integrations/google-meet/connect?organizationId=${organizationId}`}
                  className={buttonVariants()}
                >
                  <ExternalLinkIcon />{" "}
                  {google
                    ? "Hubungkan ulang Google Meet"
                    : "Hubungkan Google Meet"}
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UnplugIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Putuskan koneksi Zoom?</AlertDialogTitle>
            <AlertDialogDescription>
              Hakgyo akan mencabut koneksi Zoom yang tersimpan. Meeting Group
              belajar baru tidak dapat dibuat sampai Zoom dihubungkan lagi.
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
      <AlertDialog
        open={disconnectGoogleOpen}
        onOpenChange={setDisconnectGoogleOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UnplugIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Putuskan koneksi Google Meet?</AlertDialogTitle>
            <AlertDialogDescription>
              Meeting baru tidak dapat dibuat melalui Google Meet sampai akun
              dihubungkan lagi. Meeting yang sudah dijadwalkan tetap ada di
              kalender penyelenggara.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnectGoogle.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnectGoogle.isPending}
              onClick={() => void handleGoogleDisconnect()}
            >
              {disconnectGoogle.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <UnplugIcon />
              )}
              Putuskan koneksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
