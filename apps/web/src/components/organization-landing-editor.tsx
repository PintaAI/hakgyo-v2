"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
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
  const [mobile, setMobile] = useState(false);
  const [tab, setTab] = useState("copy");
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
        setTab("copy");
        setActiveField(data.key);
        document
          .getElementById(`copy-${data.key}`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [changeCopy, postToPreview]);

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

  return (
    <div className="bg-background fixed inset-0 z-40 flex flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <Link
          href={`/workspace/${draft.organization.slug}/dashboard`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon />
          Workspace
        </Link>
        <h1 className="font-medium">Landing page</h1>
        <Badge variant={isLive ? "default" : "secondary"}>
          {isLive
            ? upToDate
              ? "Live"
              : "Live · ada perubahan draft"
            : "Belum dipublikasikan"}
        </Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={mobile ? "ghost" : "secondary"}
              size="icon-sm"
              aria-label="Pratinjau desktop"
              aria-pressed={!mobile}
              onClick={() => setMobile(false)}
            >
              <MonitorIcon />
            </Button>
            <Button
              variant={mobile ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Pratinjau mobile"
              aria-pressed={mobile}
              onClick={() => setMobile(true)}
            >
              <SmartphoneIcon />
            </Button>
          </div>
          {isLive && (
            <a
              href={draft.publicUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLinkIcon />
              Lihat live
            </a>
          )}
          {isLive && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void confirmUnpublish()}
            >
              Nonaktifkan
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

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="bg-muted/40 flex min-h-[50vh] flex-1 justify-center overflow-hidden p-4">
          <iframe
            ref={frame}
            src={previewSrc}
            title="Pratinjau draft landing page"
            sandbox="allow-scripts"
            className={cn(
              "h-full rounded-lg border bg-white shadow-sm transition-[width]",
              mobile ? "w-[390px]" : "w-full",
            )}
          />
        </main>

        <aside className="flex min-h-0 w-full flex-col border-t lg:w-96 lg:border-t-0 lg:border-l">
          {remoteChanged && dirty && (
            <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2.5 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
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
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(String(value))}
            className="min-h-0 flex-1 gap-0"
          >
            <TabsList
              variant="line"
              className="h-11 w-full justify-start rounded-none border-b px-4"
            >
              <TabsTrigger value="copy">Teks</TabsTrigger>
              <TabsTrigger value="ai">Desain dengan AI</TabsTrigger>
              <TabsTrigger value="images">Gambar</TabsTrigger>
              <TabsTrigger value="history">Riwayat</TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          </Tabs>
          {dirty && (
            <div className="flex justify-end gap-2 border-t p-3">
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
        </aside>
      </div>
      {dialogs}
    </div>
  );
}
