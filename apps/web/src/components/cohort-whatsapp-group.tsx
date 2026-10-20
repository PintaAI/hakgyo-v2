"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  MessageCirclePlusIcon,
  Settings2Icon,
  UnlinkIcon,
} from "lucide-react";
import { toast } from "sonner";

import Link from "~/components/link";
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
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getErrorMessage } from "~/lib/error-message";
import { formatWhatsappNumber } from "~/lib/whatsapp";
import { api } from "~/trpc/react";

/**
 * The WhatsApp group of a cohort in its settings: a group Hakgyo created
 * (linked, its link is managed here), or a link typed by hand, which is part
 * of the settings form (`manualUrl`).
 */
export function CohortWhatsappGroup({
  cohort,
  organizationSlug,
  manualUrl,
  onManualUrlChange,
}: {
  cohort: {
    id: string;
    whatsappGroupJid: string | null;
    whatsappGroupUrl: string | null;
  };
  organizationSlug: string;
  manualUrl: string;
  onManualUrlChange: (value: string) => void;
}) {
  const utils = api.useUtils();
  const status = api.whatsapp.getCohortStatus.useQuery({ cohortId: cohort.id });
  const create = api.whatsapp.createCohortGroup.useMutation();
  const unlink = api.whatsapp.unlinkCohortGroup.useMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [participant, setParticipant] = useState<string | null>(null);

  const data = status.data;
  const enabled = data?.enabled === true;
  const connected = enabled && data.connectionStatus === "CONNECTED";
  const savedParticipant =
    enabled && data.initialParticipantPhone
      ? formatWhatsappNumber(data.initialParticipantPhone)
      : "";
  const participantValue = participant ?? savedParticipant;

  async function refresh() {
    await Promise.all([
      utils.cohort.get.invalidate({ cohortId: cohort.id }),
      utils.whatsapp.getCohortStatus.invalidate({ cohortId: cohort.id }),
    ]);
  }

  async function createGroup() {
    try {
      const result = await create.mutateAsync({
        cohortId: cohort.id,
        participantPhone: participantValue.trim() || null,
      });
      setCreateOpen(false);
      setParticipant(null);
      await refresh();
      if (result.status === "CREATED") {
        toast.success(
          "Grup WhatsApp dibuat. Link-nya sudah tampil untuk murid.",
        );
      } else {
        toast.info(
          "Batas pembuatan grup per jam tercapai. Grup dibuat otomatis begitu memungkinkan.",
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      await refresh();
    }
  }

  async function unlinkGroup() {
    try {
      await unlink.mutateAsync({ cohortId: cohort.id });
      setUnlinkOpen(false);
      await refresh();
      toast.success(
        "Grup dilepas. Hakgyo berhenti mengirim pesan ke grup ini.",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (cohort.whatsappGroupJid) {
    return (
      <div className="space-y-2">
        <Label>Grup WhatsApp</Label>
        <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-medium">Dibuat oleh Hakgyo</p>
            <p className="text-muted-foreground truncate">
              {cohort.whatsappGroupUrl ?? "Menyiapkan link undangan"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Pengingat meeting dan jadwal Latihan/Tryout dikirim ke grup ini.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {cohort.whatsappGroupUrl ? (
              <a
                href={cohort.whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Buka
                <ExternalLinkIcon data-icon="inline-end" />
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnlinkOpen(true)}
            >
              <UnlinkIcon />
              Lepaskan grup
            </Button>
          </div>
        </div>

        <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <UnlinkIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Lepaskan grup WhatsApp?</AlertDialogTitle>
              <AlertDialogDescription>
                Hakgyo berhenti mengirim pesan ke grup ini. Grupnya tetap ada di
                WhatsApp dan link-nya tetap tampil untuk murid sampai Anda
                menggantinya.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={unlink.isPending}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={unlink.isPending}
                onClick={() => void unlinkGroup()}
              >
                {unlink.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <UnlinkIcon />
                )}
                Lepaskan grup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="settings-cohort-whatsapp">WhatsApp URL</Label>
      <Input
        id="settings-cohort-whatsapp"
        type="url"
        placeholder="https://chat.whatsapp.com/..."
        value={manualUrl}
        onChange={(event) => onManualUrlChange(event.target.value)}
      />
      {enabled ? (
        data.pendingCreate ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Pembuatan grup WhatsApp sedang antre.
          </p>
        ) : connected ? (
          <div className="space-y-2 pt-1">
            {data.lastCreateError ? (
              <p className="text-destructive text-sm">
                Grup belum berhasil dibuat: {data.lastCreateError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <MessageCirclePlusIcon />
              Buat grup WhatsApp
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Hubungkan nomor WhatsApp lembaga untuk membuat grup kelas dari
            Hakgyo.{" "}
            <Link
              href={`/workspace/${organizationSlug}/settings/integrations`}
              className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              <Settings2Icon className="size-3.5" />
              Pengaturan integrasi
            </Link>
          </p>
        )
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              // The dialog is portaled, but React still bubbles the submit to
              // the settings form around this component.
              event.stopPropagation();
              void createGroup();
            }}
          >
            <DialogHeader>
              <DialogTitle>Buat grup WhatsApp</DialogTitle>
              <DialogDescription>
                Grup memakai nama kelas dan foto kurikulum. Link undangannya
                langsung tampil untuk murid di kartu kelas.
                {cohort.whatsappGroupUrl
                  ? " Link grup yang diisi manual akan diganti."
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="cohort-whatsapp-participant">
                Nomor peserta awal
              </Label>
              <Input
                id="cohort-whatsapp-participant"
                inputMode="tel"
                placeholder="0812 3456 7890"
                value={participantValue}
                onChange={(event) => setParticipant(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                WhatsApp membutuhkan satu peserta selain nomor lembaga, misalnya
                nomor pengajar kelas ini.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || !participantValue.trim()}
              >
                {create.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <MessageCirclePlusIcon />
                )}
                Buat grup
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
