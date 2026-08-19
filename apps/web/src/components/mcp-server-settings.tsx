"use client";

import { useState } from "react";
import {
  CheckIcon,
  CircleOffIcon,
  ClipboardIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  ServerCogIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
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
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} disalin.`);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {copied ? <CheckIcon /> : <ClipboardIcon />}
      {copied ? "Tersalin" : "Salin"}
    </Button>
  );
}

function formatDate(value: Date | null) {
  return value
    ? value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "Tidak tersedia";
}

export function McpServerSettings({ endpoint }: { endpoint: string }) {
  const utils = api.useUtils();
  const authorizations = api.account.listMcpAuthorizations.useQuery();
  const revoke = api.account.revokeMcpAuthorization.useMutation();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const selected = authorizations.data?.find(
    (authorization) => authorization.clientId === selectedClientId,
  );
  const config = JSON.stringify(
    { mcp: { hakgyo: { type: "remote", url: endpoint } } },
    null,
    2,
  );

  async function handleRevoke() {
    if (!selectedClientId) return;
    try {
      await revoke.mutateAsync({ clientId: selectedClientId });
      await utils.account.listMcpAuthorizations.invalidate();
      setSelectedClientId(null);
      toast.success("Akses MCP dicabut.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mencabut akses MCP.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <ServerCogIcon className="size-4" />
          Model Context Protocol
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          MCP Server
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Hubungkan asisten AI ke Hakgyo dan kelola aplikasi yang memiliki akses
          atas nama akun Anda.
        </p>
      </div>

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-16 size-52 rounded-full bg-emerald-500/10 blur-3xl" />
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-foreground text-background flex size-11 items-center justify-center rounded-xl shadow-sm">
                <TerminalSquareIcon className="size-5" />
              </div>
              <div>
                <CardTitle>Hakgyo remote server</CardTitle>
                <CardDescription>
                  OAuth 2.1 dengan dynamic client registration
                </CardDescription>
              </div>
            </div>
            <Badge className="gap-1.5 bg-emerald-600 text-white">
              <span className="size-1.5 rounded-full bg-white" /> Aktif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-2">
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Endpoint
            </p>
            <div className="bg-muted/60 flex items-center gap-2 rounded-lg border p-2 pl-3">
              <code className="min-w-0 flex-1 truncate text-xs">
                {endpoint}
              </code>
              <CopyButton value={endpoint} label="Endpoint" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheckIcon,
                title: "OAuth",
                description: "Login aman via Hakgyo",
              },
              {
                icon: KeyRoundIcon,
                title: "Hak akses",
                description: "Mengikuti role pengguna",
              },
              {
                icon: ServerCogIcon,
                title: "Transport",
                description: "Streamable HTTP",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-lg border p-3">
                <Icon className="text-muted-foreground mb-3 size-4" />
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Hubungkan MCP client</CardTitle>
          <CardDescription>
            Tambahkan konfigurasi berikut ke OpenCode, lalu selesaikan login di
            browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-foreground text-background relative rounded-lg p-4 shadow-inner">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-background/60 text-xs font-medium">
                opencode.json
              </span>
              <CopyButton value={config} label="Konfigurasi" />
            </div>
            <pre className="overflow-x-auto text-xs leading-5">
              <code>{config}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Aplikasi terotorisasi</CardTitle>
          <CardDescription>
            Client yang dapat menggunakan MCP sebagai akun Hakgyo Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          {authorizations.isPending ? (
            <div className="text-muted-foreground flex min-h-28 items-center justify-center text-sm">
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" /> Memuat
              akses
            </div>
          ) : authorizations.error ? (
            <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-center">
              <p className="text-destructive text-sm">
                {authorizations.error.message}
              </p>
              <Button
                variant="outline"
                onClick={() => authorizations.refetch()}
              >
                Coba lagi
              </Button>
            </div>
          ) : authorizations.data.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center text-center">
              <CircleOffIcon className="text-muted-foreground mb-3 size-6" />
              <p className="font-medium">Belum ada client terhubung</p>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Client akan muncul di sini setelah Anda menyetujui akses OAuth.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {authorizations.data.map((authorization) => (
                <div
                  key={authorization.id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center"
                >
                  <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg border">
                    <TerminalSquareIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {authorization.name}
                      </p>
                      <Badge variant="secondary">Terhubung</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Diotorisasi{" "}
                      {formatDate(
                        authorization.updatedAt ?? authorization.createdAt,
                      )}
                      {authorization.refreshTokenExpiresAt
                        ? ` · Refresh berakhir ${formatDate(authorization.refreshTokenExpiresAt)}`
                        : ""}
                    </p>
                    {authorization.uri ? (
                      <a
                        href={authorization.uri}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: "link", size: "xs" }),
                          "mt-1 px-0",
                        )}
                      >
                        Situs client <ExternalLinkIcon />
                      </a>
                    ) : null}
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setSelectedClientId(authorization.clientId)}
                  >
                    Cabut akses
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={selectedClientId !== null}
        onOpenChange={(open) => !open && setSelectedClientId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleOffIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Cabut akses {selected?.name ?? "MCP client"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Access token, refresh token, dan persetujuan OAuth client ini akan
              dicabut. Anda perlu login ulang untuk menghubungkannya kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => void handleRevoke()}
            >
              {revoke.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CircleOffIcon />
              )}
              Cabut akses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
