"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MonitorIcon,
  RefreshCwIcon,
  SmartphoneIcon,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  formatTime,
  LandingAiPanel,
  LandingCopyPanel,
  LandingImagesPanel,
  LandingRevisionsPanel,
} from "~/components/landing-editor-panels";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useDialogs } from "~/components/ui/use-dialogs";
import { useIsMobile } from "~/hooks/use-mobile";
import { MAX_LANDING_FIELD_LENGTH } from "~/lib/organization-landing";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type LandingDraft = RouterOutputs["organizationLanding"]["get"];

// Short enough that MCP edits feel live, long enough to stay cheap.
const STATUS_POLL_MS = 3_000;

// Messages from the preview's editing bridge (editor-bridge.ts). The frame
// also runs AI-authored scripts, so every message is validated as untrusted.
const previewMessageSchema = z.discriminatedUnion("type", [
  z.object({ source: z.literal("hakgyo-landing"), type: z.literal("ready") }),
  z.object({
    source: z.literal("hakgyo-landing"),
    type: z.literal("input"),
    key: z.string(),
    text: z.string().max(MAX_LANDING_FIELD_LENGTH),
  }),
  z.object({
    source: z.literal("hakgyo-landing"),
    type: z.literal("focus"),
    key: z.string(),
  }),
]);

export function OrganizationLandingEditor({
  organizationId,
}: {
  organizationId: string;
}) {
  const query = api.organizationLanding.get.useQuery({ organizationId });
  if (query.isPending)
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Memuat landing page…
      </div>
    );
  if (!query.data)
    return (
      <div className="grid justify-items-center gap-4 py-20">
        <p role="alert">{query.error?.message ?? "Halaman gagal dimuat."}</p>
        <Button onClick={() => void query.refetch()}>Coba lagi</Button>
      </div>
    );
  return <LandingEditor organizationId={organizationId} draft={query.data} />;
}

function LandingEditor({
  organizationId,
  draft,
}: {
  organizationId: string;
  draft: LandingDraft;
}) {
  const utils = api.useUtils();
  const { confirm, dialogs } = useDialogs();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();
  const [narrowPreview, setNarrowPreview] = useState(false);
  const [tab, setTab] = useState("preview");
  const [activeField, setActiveField] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const status = api.organizationLanding.status.useQuery(
    { organizationId },
    { refetchInterval: STATUS_POLL_MS },
  );
  const dirty = Object.keys(edits).length > 0;
  const remoteChanged =
    !!status.data &&
    (status.data.revisionId !== draft.revisionId ||
      status.data.publishedRevisionId !== draft.publishedRevisionId);

  const reload = useCallback(
    () =>
      Promise.all([
        utils.organizationLanding.get.invalidate({ organizationId }),
        utils.organizationLanding.status.invalidate({ organizationId }),
        utils.organizationLanding.revisions.invalidate({ organizationId }),
      ]),
    [utils, organizationId],
  );

  // Pick up MCP revisions automatically unless that would discard copy edits.
  useEffect(() => {
    if (remoteChanged && !dirty) void reload();
  }, [remoteChanged, dirty, reload]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const saveCopy = api.organizationLanding.updateCopy.useMutation({
    onSuccess: async () => {
      setEdits({});
      await reload();
      toast.success("Teks disimpan ke draft.");
    },
    onError: (error) => toast.error(error.message),
  });
  const publish = api.organizationLanding.publish.useMutation({
    onSuccess: async () => {
      await reload();
      toast.success("Landing page dipublikasikan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const unpublish = api.organizationLanding.unpublish.useMutation({
    onSuccess: async () => {
      await reload();
      toast.success("Landing page tidak lagi tampil untuk publik.");
    },
    onError: (error) => toast.error(error.message),
  });
  const busy = saveCopy.isPending || publish.isPending || unpublish.isPending;

  const changeCopy = useCallback(
    (key: string, value: string) => {
      const original = draft.fields.find((field) => field.key === key)?.text;
      setEdits((current) => {
        const rest = Object.fromEntries(
          Object.entries(current).filter(([existing]) => existing !== key),
        );
        return value === original ? rest : { ...rest, [key]: value };
      });
    },
    [draft.fields],
  );

  const copy = useMemo(
    () =>
      Object.fromEntries(
        draft.fields.map((field) => [
          field.key,
          edits[field.key] ?? field.text,
        ]),
      ),
    [draft.fields, edits],
  );
  const copyRef = useRef(copy);

  const postToPreview = useCallback(
    (
      message:
        | { type: "set"; copy: Record<string, string> }
        | { type: "reveal"; key: string },
    ) =>
      frame.current?.contentWindow?.postMessage(
        { source: "hakgyo-editor", ...message },
        "*",
      ),
    [],
  );

  // Mirror panel edits and discards onto the canvas.
  useEffect(() => {
    copyRef.current = copy;
    postToPreview({ type: "set", copy });
  }, [copy, postToPreview]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const message = previewMessageSchema.safeParse(event.data);
      if (!message.success) return;
      const data = message.data;
      if (data.type === "ready")
        postToPreview({ type: "set", copy: copyRef.current });
      else if (!(data.key in copyRef.current)) return;
      else if (data.type === "input") changeCopy(data.key, data.text);
      else {
        // Phones keep editing on the canvas instead of jumping to the panel.
        if (!isMobile) setTab("copy");
        setActiveField(data.key);
        document
          .getElementById(`copy-${data.key}`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [changeCopy, isMobile, postToPreview]);

  async function confirmUnpublish() {
    const confirmed = await confirm({
      title: "Nonaktifkan landing page?",
      description:
        "Halaman publik langsung hilang. Draft dan riwayat revisi tetap tersimpan.",
      confirmLabel: "Nonaktifkan",
      destructive: true,
    });
    if (confirmed) unpublish.mutate({ organizationId });
  }

  const isLive = !!draft.publishedAt;
  const upToDate = isLive && draft.revisionId === draft.publishedRevisionId;
  const previewSrc = `/api/organization-landing/draft/${encodeURIComponent(organizationId)}?edit=1&revision=${draft.revisionId ?? "starter"}`;
  // Phones show one full-screen tab at a time; wider screens always show the
  // preview beside the panel, so "preview" falls back to the copy tab there.
  const view = !isMobile && tab === "preview" ? "copy" : tab;
  const statusLabel = isLive
    ? upToDate
      ? { short: "Live", full: "Live" }
      : { short: "Diubah", full: "Live · ada perubahan draft" }
    : { short: "Draft", full: "Belum dipublikasikan" };

  return (
    <div className="bg-background fixed inset-0 z-40 flex flex-col">
      <header className="flex items-center gap-1.5 border-b px-2 py-2 sm:gap-2 sm:px-4">
        <Link
          href={`/workspace/${draft.organization.slug}/dashboard`}
          aria-label="Kembali ke workspace"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon />
          <span className="hidden sm:inline">Workspace</span>
        </Link>
        <h1 className="min-w-0 truncate font-medium">Landing page</h1>
        <Badge variant={isLive ? "default" : "secondary"} className="shrink-0">
          <span className="sm:hidden">{statusLabel.short}</span>
          <span className="hidden sm:inline">{statusLabel.full}</span>
        </Badge>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden rounded-lg border p-0.5 md:flex">
            <Button
              variant={narrowPreview ? "ghost" : "secondary"}
              size="icon-sm"
              aria-label="Pratinjau desktop"
              aria-pressed={!narrowPreview}
              onClick={() => setNarrowPreview(false)}
            >
              <MonitorIcon />
            </Button>
            <Button
              variant={narrowPreview ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Pratinjau mobile"
              aria-pressed={narrowPreview}
              onClick={() => setNarrowPreview(true)}
            >
              <SmartphoneIcon />
            </Button>
          </div>
          {isLive && (
            <a
              href={draft.publicUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Lihat halaman live"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLinkIcon />
              <span className="hidden sm:inline">Lihat live</span>
            </a>
          )}
          {isLive && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Nonaktifkan landing page"
              disabled={busy}
              onClick={() => void confirmUnpublish()}
            >
              <EyeOffIcon />
              <span className="hidden sm:inline">Nonaktifkan</span>
            </Button>
          )}
          <Button
            size="sm"
            disabled={busy || dirty || upToDate}
            title={
              dirty ? "Simpan atau batalkan perubahan teks dulu" : undefined
            }
            onClick={() =>
              publish.mutate({ organizationId, revisionId: draft.revisionId })
            }
          >
            {publish.isPending && <LoaderCircleIcon className="animate-spin" />}
            Publikasikan
          </Button>
        </div>
      </header>

      <Tabs
        value={view}
        onValueChange={(value) => setTab(String(value))}
        className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_24rem]"
      >
        {remoteChanged && dirty && (
          <div className="row-start-1 flex items-center gap-2 border-b bg-amber-50 px-4 py-2.5 text-sm text-amber-950 md:col-start-2 md:border-l dark:bg-amber-950/40 dark:text-amber-100">
            <p className="flex-1">Ada versi draft baru, misalnya dari AI.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEdits({});
                void reload();
              }}
            >
              <RefreshCwIcon />
              Muat
            </Button>
          </div>
        )}
        <TabsList
          variant="line"
          className="row-start-2 h-11 w-full justify-start overflow-x-auto rounded-none border-b px-2 [scrollbar-width:none] md:col-start-2 md:border-l md:px-4 [&::-webkit-scrollbar]:hidden"
        >
          <TabsTrigger value="preview" className="flex-none md:hidden">
            Pratinjau
          </TabsTrigger>
          <TabsTrigger value="copy" className="flex-none md:flex-1">
            Teks
            {dirty && (
              <span
                aria-label="ada perubahan belum disimpan"
                className="bg-primary size-1.5 rounded-full"
              />
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-none md:flex-1">
            <span className="lg:hidden">AI</span>
            <span className="hidden lg:inline">Desain dengan AI</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="flex-none md:flex-1">
            Gambar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-none md:flex-1">
            Riwayat
          </TabsTrigger>
        </TabsList>

        <main
          className={cn(
            "bg-muted/40 row-start-3 min-h-0 justify-center overflow-hidden md:col-start-1 md:row-span-4 md:row-start-1 md:flex md:p-4",
            view === "preview" ? "flex" : "hidden",
          )}
        >
          <iframe
            ref={frame}
            src={previewSrc}
            title="Pratinjau draft landing page"
            sandbox="allow-scripts"
            className={cn(
              "size-full bg-white transition-[width] md:rounded-lg md:border md:shadow-sm",
              narrowPreview && "md:w-[390px]",
            )}
          />
        </main>

        <div
          className={cn(
            "row-start-3 min-h-0 overflow-y-auto overscroll-contain p-4 md:col-start-2 md:block md:border-l",
            view === "preview" && "hidden",
          )}
        >
          <TabsContent value="copy" className="grid gap-4">
            <p className="text-muted-foreground text-sm">
              {draft.isStarterTemplate
                ? "Ini template awal. Desain ulang dengan AI, atau klik teks di pratinjau untuk mengeditnya."
                : `Klik teks di pratinjau untuk mengeditnya langsung. Draft terakhir diubah ${draft.updatedAt ? formatTime(draft.updatedAt) : "-"}.`}
            </p>
            <LandingCopyPanel
              fields={draft.fields}
              edits={edits}
              activeKey={activeField}
              onChange={changeCopy}
              onFocus={(key) => {
                setActiveField(key);
                postToPreview({ type: "reveal", key });
              }}
            />
          </TabsContent>
          <TabsContent value="ai">
            <LandingAiPanel organizationId={organizationId} draft={draft} />
          </TabsContent>
          <TabsContent value="images">
            <LandingImagesPanel
              organizationId={organizationId}
              images={draft.images}
            />
          </TabsContent>
          <TabsContent value="history">
            <LandingRevisionsPanel
              organizationId={organizationId}
              draft={draft}
              canRestore={!dirty && !busy}
              onRestored={() => void reload()}
            />
          </TabsContent>
        </div>

        {dirty && (
          <div className="row-start-4 flex items-center justify-end gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:col-start-2 md:border-l">
            <p className="text-muted-foreground mr-auto text-sm md:hidden">
              {Object.keys(edits).length} teks diubah
            </p>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setEdits({})}
            >
              Batal
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                saveCopy.mutate({
                  organizationId,
                  baseRevisionId: draft.revisionId,
                  copy: edits,
                })
              }
            >
              {saveCopy.isPending && (
                <LoaderCircleIcon className="animate-spin" />
              )}
              Simpan teks
            </Button>
          </div>
        )}
      </Tabs>
      {dialogs}
    </div>
  );
}
