"use client";

import { useState, type FormEvent } from "react";
import {
  ClipboardIcon,
  LinkIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Invite belum berhasil diproses. Silakan coba lagi.";
}

export function CohortInvites({
  courseId,
  cohortId,
  cohortName,
}: {
  courseId: string;
  cohortId: string;
  cohortName: string;
}) {
  const utils = api.useUtils();
  const invites = api.enrollment.listInvites.useInfiniteQuery(
    { courseId, cohortId, includeTotal: true },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const createInvite = api.enrollment.createInvite.useMutation();
  const revokeInvite = api.enrollment.revokeInvite.useMutation();
  const [open, setOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [oneTime, setOneTime] = useState(true);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function refresh() {
    await utils.enrollment.listInvites.invalidate({ courseId, cohortId });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const invite = await createInvite.mutateAsync({
        courseId,
        cohortId,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
        maxUses: oneTime ? 1 : maxUses ? Number(maxUses) : null,
      });
      await refresh();
      setNewToken(invite.token);
      toast.success("Link invite siap dibagikan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function copyInvite() {
    if (!newToken) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/invite/${newToken}`,
    );
    toast.success("Link invite disalin.");
  }

  async function revoke(inviteId: string) {
    try {
      await revokeInvite.mutateAsync({ inviteId });
      await refresh();
      toast.success("Invite dicabut.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function closeDialog() {
    setOpen(false);
    setNewToken(null);
    setExpiresAt("");
    setMaxUses("");
    setOneTime(true);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            Akses langsung
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
            Invite {cohortName}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Siapa pun yang menebus link akan masuk ke course dan Group belajar
            ini.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <LinkIcon data-icon="inline-start" />
          Buat link invite
        </Button>
      </div>

      <div className="bg-muted/50 flex items-start gap-3 rounded-lg border px-4 py-3 text-xs leading-relaxed">
        <MailPlusIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground">
          Link hanya ditampilkan saat dibuat. Atur tanggal kedaluwarsa atau
          batas penggunaan untuk membatasi penyebarannya.
        </p>
      </div>

      {invites.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : invites.isError ? (
        <Card className="rounded-lg">
          <CardContent className="py-10 text-center">
            <p className="text-destructive text-sm">
              {errorMessage(invites.error)}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void invites.refetch()}
            >
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : (invites.data?.pages.flatMap((page) => page.items) ?? []).length ===
        0 ? (
        <Card className="rounded-lg border-dashed">
          <CardContent className="py-12 text-center">
            <span className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
              <MailPlusIcon className="text-muted-foreground size-5" />
            </span>
            <h3 className="mt-4 font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
              Belum ada link invite
            </h3>
            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
              Buat link pertama untuk mengundang siswa langsung ke Group belajar
              ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(invites.data?.pages.flatMap((page) => page.items) ?? []).map(
            (invite) => {
              const expired = Boolean(
                invite.expiresAt && invite.expiresAt <= new Date(),
              );
              const exhausted =
                invite.maxUses !== null && invite.useCount >= invite.maxUses;
              const active = !invite.revokedAt && !expired && !exhausted;
              const status = invite.revokedAt
                ? "Dicabut"
                : expired
                  ? "Kedaluwarsa"
                  : exhausted
                    ? "Habis"
                    : "Aktif";

              return (
                <Card key={invite.id} className="rounded-lg py-0">
                  <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={active ? "default" : "outline"}>
                          {status}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          dibuat oleh {invite.createdBy.user.name}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span>
                          <strong className="font-medium tabular-nums">
                            {invite.useCount} / {invite.maxUses ?? "∞"}
                          </strong>{" "}
                          <span className="text-muted-foreground">
                            digunakan
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {invite.expiresAt
                            ? `Berlaku hingga ${dateFormatter.format(invite.expiresAt)}`
                            : "Tanpa batas waktu"}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="self-start sm:self-auto"
                      variant="outline"
                      disabled={!active || revokeInvite.isPending}
                      onClick={() => revoke(invite.id)}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Cabut
                    </Button>
                  </CardContent>
                </Card>
              );
            },
          )}
          {invites.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={invites.isFetchingNextPage}
              onClick={() => void invites.fetchNextPage()}
            >
              {invites.isFetchingNextPage ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Muat invite berikutnya
            </Button>
          ) : null}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => (value ? setOpen(true) : closeDialog())}
      >
        <DialogContent className="sm:max-w-md">
          {newToken ? (
            <div>
              <DialogHeader>
                <DialogTitle>Link invite siap</DialogTitle>
                <DialogDescription>
                  Salin sekarang. Demi keamanan, link ini tidak ditampilkan
                  kembali setelah dialog ditutup.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted mt-5 rounded-lg border p-4">
                <p className="text-muted-foreground font-mono text-xs leading-relaxed break-all">
                  /invite/{newToken}
                </p>
              </div>
              <DialogFooter className="mt-5">
                <Button variant="outline" onClick={closeDialog}>
                  Selesai
                </Button>
                <Button onClick={copyInvite}>
                  <ClipboardIcon data-icon="inline-start" />
                  Salin link
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Buat link invite</DialogTitle>
                <DialogDescription>
                  Link akan memasukkan siswa langsung ke {cohortName}.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 grid gap-4">
                <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
                  <div className="grid gap-1">
                    <Label htmlFor="cohort-invite-one-time">
                      Link sekali pakai
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Link otomatis tidak berlaku setelah berhasil digunakan.
                    </p>
                  </div>
                  <Switch
                    id="cohort-invite-one-time"
                    checked={oneTime}
                    onCheckedChange={setOneTime}
                    aria-label="Link sekali pakai"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cohort-invite-expiry">Berlaku hingga</Label>
                    <Input
                      id="cohort-invite-expiry"
                      type="date"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cohort-invite-uses">Maks. penggunaan</Label>
                    <Input
                      id="cohort-invite-uses"
                      disabled={oneTime}
                      min={1}
                      placeholder={oneTime ? "1" : "Tanpa batas"}
                      type="number"
                      value={maxUses}
                      onChange={(event) => setMaxUses(event.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-5">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Batal
                </Button>
                <Button type="submit" disabled={createInvite.isPending}>
                  {createInvite.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <LinkIcon />
                  )}
                  Buat invite
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
