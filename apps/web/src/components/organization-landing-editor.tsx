"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Layers,
  LoaderCircle,
  Monitor,
  MousePointer2,
  Paintbrush,
  Pencil,
  Redo2,
  Search,
  Smartphone,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "~/components/ui/button";
import { OrganizationLandingPage } from "~/components/organization-landing-page";
import {
  LandingContentControls,
  type EditorSection,
} from "~/components/landing-content-controls";
import { LandingDesignControls } from "~/components/landing-design-controls";
import {
  organizationLandingConfigSchema,
  type OrganizationLandingConfig,
} from "~/lib/organization-landing";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import styles from "./landing-editor.module.css";

type LandingData = RouterOutputs["organizationLanding"]["get"];
const labels: Record<EditorSection, string> = {
  hero: "Hero",
  courses: "Program & course",
  about: "Tentang kami",
  features: "Keunggulan",
  testimonials: "Testimoni",
  faq: "Pertanyaan umum",
  contact: "Kontak",
  seo: "SEO & berbagi",
};
export function OrganizationLandingEditor({
  organizationId,
}: {
  organizationId: string;
}) {
  const query = api.organizationLanding.get.useQuery({ organizationId });
  if (query.isPending)
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-sm">
        <LoaderCircle className="size-4 animate-spin" />
        Menyiapkan studio…
      </div>
    );
  if (!query.data || query.error)
    return (
      <div className="grid justify-items-center gap-4 py-20">
        <p role="alert">{query.error?.message ?? "Halaman gagal dimuat."}</p>
        <Button onClick={() => query.refetch()}>Coba lagi</Button>
      </div>
    );
  return (
    <LandingStudio
      key={organizationId}
      initial={query.data}
      organizationId={organizationId}
    />
  );
}
function LandingStudio({
  initial,
  organizationId,
}: {
  initial: LandingData;
  organizationId: string;
}) {
  const [history, setHistory] = useState({
    past: [] as OrganizationLandingConfig[],
    present: initial.config,
    future: [] as OrganizationLandingConfig[],
  });
  const config = history.present;
  const [saved, setSaved] = useState(JSON.stringify(initial.config));
  const [published, setPublished] = useState(!!initial.publishedAt);
  const [savedOnce, setSavedOnce] = useState(!!initial.updatedAt);
  const [selected, setSelected] = useState<EditorSection>("hero");
  const [tab, setTab] = useState<"sections" | "content" | "design">("sections");
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [validation, setValidation] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const save = api.organizationLanding.saveDraft.useMutation();
  const publish = api.organizationLanding.publish.useMutation();
  const unpublish = api.organizationLanding.unpublish.useMutation();
  const utils = api.useUtils();
  const dirty = JSON.stringify(config) !== saved;
  const busy = save.isPending || publish.isPending || unpublish.isPending;
  const path = `/${initial.organization.slug}`;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: OrganizationLandingConfig) {
    setHistory((current) =>
      JSON.stringify(next) === JSON.stringify(current.present)
        ? current
        : {
            past: [...current.past, current.present].slice(-60),
            present: next,
            future: [],
          },
    );
    setValidation(null);
  }
  function update<K extends keyof OrganizationLandingConfig>(
    key: K,
    value: OrganizationLandingConfig[K],
  ) {
    change({ ...config, [key]: value });
  }
  function undo() {
    setHistory((current) => {
      const last = current.past.at(-1);
      return last
        ? {
            past: current.past.slice(0, -1),
            present: last,
            future: [current.present, ...current.future],
          }
        : current;
    });
  }
  function redo() {
    setHistory((current) => {
      const first = current.future[0];
      return first
        ? {
            past: [...current.past, current.present],
            present: first,
            future: current.future.slice(1),
          }
        : current;
    });
  }
  function select(section: EditorSection, content = true) {
    setSelected(section);
    setPanelOpen(true);
    if (content) setTab("content");
    canvas.current
      ?.querySelector(`[data-landing-section="${section}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function move(index: number, delta: number) {
    const next = [...config.sectionOrder];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    update("sectionOrder", next);
  }
  async function persist(makePublic: boolean) {
    const result = organizationLandingConfigSchema.safeParse(config);
    if (!result.success) {
      const issue = result.error.issues[0];
      setValidation(`${issue?.path.join(" → ")}: ${issue?.message}`);
      toast.error("Periksa isian yang ditandai sebelum menyimpan.");
      return;
    }
    try {
      await save.mutateAsync({ organizationId, config: result.data });
      setSaved(JSON.stringify(result.data));
      setSavedOnce(true);
      if (makePublic) {
        await publish.mutateAsync({ organizationId });
        setPublished(true);
      }
      await utils.organizationLanding.get.invalidate({ organizationId });
      toast.success(
        makePublic
          ? "Halaman berhasil dipublikasikan."
          : "Draft tersimpan. Halaman publik belum berubah.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan halaman.",
      );
    }
  }
  async function takeOffline() {
    try {
      await unpublish.mutateAsync({ organizationId });
      setPublished(false);
      await utils.organizationLanding.get.invalidate({ organizationId });
      toast.success("Halaman tidak lagi tersedia untuk publik.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menghentikan publikasi.",
      );
    }
  }
  function canvasClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("a")) event.preventDefault();
    if (preview) return;
    const section = target.closest<HTMLElement>("[data-landing-section]")
      ?.dataset.landingSection;
    if (section && section in labels) {
      setSelected(section as EditorSection);
      setTab("content");
      setPanelOpen(true);
    }
  }
  return (
    <div className={styles.studio}>
      <header className={styles.toolbar}>
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/workspace/${initial.organization.slug}/dashboard`}
            aria-label="Kembali ke workspace"
            className="hover:bg-muted rounded-md p-2"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="h-5 border-l" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {initial.organization.name}
              <span className="text-muted-foreground ml-2 font-normal">
                / Site studio
              </span>
            </h1>
            <p
              className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[10px]"
              role="status"
            >
              {dirty ? (
                <>
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Belum disimpan
                </>
              ) : (
                <>
                  <Check className="size-3" />
                  {savedOnce
                    ? "Semua perubahan tersimpan"
                    : "Siap untuk dirancang"}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Urungkan"
            disabled={!history.past.length || busy}
            onClick={undo}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ulangi"
            disabled={!history.future.length || busy}
            onClick={redo}
          >
            <Redo2 />
          </Button>
          <span className="mx-2 hidden h-5 border-l sm:block" />
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => persist(false)}
          >
            Simpan draft
          </Button>
          <Button disabled={busy} onClick={() => persist(true)}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Globe />}
            <span className="hidden sm:inline">
              {published ? "Publikasikan perubahan" : "Publikasikan"}
            </span>
            <span className="sm:hidden">Publikasikan</span>
          </Button>
        </div>
      </header>
      {validation && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive border-b px-5 py-3 text-xs"
        >
          {validation}
        </div>
      )}
      <div className={styles.workbench}>
        {!preview && panelOpen && (
          <aside
            className={styles.inspector}
            aria-label="Kontrol desain halaman"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-xs font-medium">Website Anda</span>
              <button
                onClick={() => setPanelOpen(false)}
                aria-label="Tutup panel"
                className="hover:bg-muted rounded p-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className={styles.tabs}>
              {(
                [
                  { id: "sections", icon: Layers, label: "Bagian" },
                  { id: "content", icon: Pencil, label: "Konten" },
                  { id: "design", icon: Paintbrush, label: "Desain" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.panelScroll}>
              {tab === "sections" && (
                <>
                  <p className="text-muted-foreground mb-5 text-[11px] leading-relaxed">
                    Pilih bagian di sini atau langsung klik pada halaman untuk
                    mengedit.
                  </p>
                  <button
                    onClick={() => select("hero")}
                    className={cn(
                      styles.layer,
                      selected === "hero" && styles.activeLayer,
                    )}
                  >
                    <span className={styles.layerThumb}>H</span>
                    <span className="flex-1 text-left">Hero</span>
                    <ChevronRight size={14} />
                  </button>
                  {config.sectionOrder.map((section, index) => {
                    const hidden = config.hiddenSections.includes(section);
                    return (
                      <div
                        key={section}
                        className={cn(
                          styles.layerRow,
                          hidden && "opacity-50",
                          selected === section && styles.activeLayer,
                        )}
                      >
                        <button
                          className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left text-xs"
                          onClick={() => select(section)}
                        >
                          <span className={styles.layerThumb}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate">{labels[section]}</span>
                        </button>
                        <div className="flex items-center">
                          <button
                            aria-label={`${hidden ? "Tampilkan" : "Sembunyikan"} ${labels[section]}`}
                            onClick={() =>
                              update(
                                "hiddenSections",
                                hidden
                                  ? config.hiddenSections.filter(
                                      (s) => s !== section,
                                    )
                                  : [...config.hiddenSections, section],
                              )
                            }
                          >
                            {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <div className="flex flex-col">
                            <button
                              disabled={!index}
                              aria-label={`Naikkan ${labels[section]}`}
                              onClick={() => move(index, -1)}
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              disabled={
                                index === config.sectionOrder.length - 1
                              }
                              aria-label={`Turunkan ${labels[section]}`}
                              onClick={() => move(index, 1)}
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    className={cn(styles.layer, "mt-6")}
                    onClick={() => select("seo")}
                  >
                    <Search size={15} />
                    <span className="flex-1 text-left">SEO & berbagi</span>
                    <ChevronRight size={14} />
                  </button>
                  <div className="mt-8 border-t pt-5">
                    <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase">
                      Alamat publik
                    </p>
                    <p className="font-mono text-xs break-all">{path}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              new URL(path, window.location.origin).href,
                            );
                            toast.success("Link disalin.");
                          } catch {
                            toast.error("Link gagal disalin.");
                          }
                        }}
                      >
                        <Copy />
                        Salin
                      </Button>
                      {published && (
                        <Link
                          href={path}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <ExternalLink />
                          Buka
                        </Link>
                      )}
                    </div>
                    {published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground mt-4"
                        disabled={busy}
                        onClick={takeOffline}
                      >
                        Batalkan publikasi
                      </Button>
                    )}
                  </div>
                </>
              )}
              {tab === "content" && (
                <>
                  <div className="mb-6">
                    <p className="text-muted-foreground mb-1 text-[10px] tracking-widest uppercase">
                      Mengedit bagian
                    </p>
                    <h2 className="text-base font-semibold">
                      {labels[selected]}
                    </h2>
                    {selected !== "hero" &&
                      selected !== "seo" &&
                      config.hiddenSections.includes(selected) && (
                        <button
                          className="mt-3 text-xs underline"
                          onClick={() =>
                            update(
                              "hiddenSections",
                              config.hiddenSections.filter(
                                (s) => s !== selected,
                              ),
                            )
                          }
                        >
                          Bagian tersembunyi · Tampilkan
                        </button>
                      )}
                  </div>
                  <LandingContentControls
                    section={selected}
                    config={config}
                    update={update}
                    initial={initial}
                  />
                  {selected === "hero" && (
                    <>
                      <div className="my-6 border-t" />
                      <p className="mb-3 text-xs font-medium">
                        Gunakan foto course
                      </p>
                      <div className="grid gap-2">
                        {initial.courses
                          .filter((c) => c.thumbnailUrl)
                          .map((course) => (
                            <button
                              key={course.id}
                              className="hover:bg-muted rounded border p-2 text-left text-xs"
                              onClick={() =>
                                update(
                                  "heroImageUrl",
                                  course.thumbnailUrl ?? "",
                                )
                              }
                            >
                              {course.title}
                            </button>
                          ))}
                      </div>
                      <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
                        Jika foto hero kosong, foto course pertama digunakan.
                        Atur komposisi dan posisi foto di tab Desain.
                      </p>
                    </>
                  )}
                </>
              )}
              {tab === "design" && (
                <>
                  <h2 className="mb-1 text-base font-semibold">
                    Art direction
                  </h2>
                  <p className="text-muted-foreground mb-6 text-[11px] leading-relaxed">
                    Setiap pilihan langsung mengubah halaman. Konten Anda tetap
                    tersimpan.
                  </p>
                  <LandingDesignControls
                    design={config.design}
                    onChange={(value) => update("design", value)}
                  />
                  <Link
                    href={`/workspace/${initial.organization.slug}/settings/general`}
                    className="mt-7 block border-t pt-5 text-xs underline underline-offset-4"
                  >
                    Ubah logo & warna brand ↗
                  </Link>
                </>
              )}
            </div>
          </aside>
        )}
        <div className={styles.stage}>
          <div className={styles.stageBar}>
            <div className="flex items-center gap-2">
              {!preview && !panelOpen && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPanelOpen(true)}
                >
                  <Layers />
                  Panel
                </Button>
              )}
              <span className="text-muted-foreground hidden text-[10px] sm:inline">
                {preview ? "PRATINJAU" : "KANVAS LANGSUNG"}
              </span>
            </div>
            <div className="bg-background flex items-center rounded-md border p-0.5">
              <button
                aria-label="Tampilan desktop"
                aria-pressed={!mobile}
                onClick={() => setMobile(false)}
                className={cn("rounded px-3 py-1.5", !mobile && "bg-muted")}
              >
                <Monitor size={14} />
              </button>
              <button
                aria-label="Tampilan seluler"
                aria-pressed={mobile}
                onClick={() => setMobile(true)}
                className={cn("rounded px-3 py-1.5", mobile && "bg-muted")}
              >
                <Smartphone size={14} />
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreview(!preview)}
            >
              {preview ? <MousePointer2 /> : <Eye />}
              {preview ? "Kembali mengedit" : "Pratinjau"}
            </Button>
          </div>
          <div className={styles.canvasScroll} ref={canvas}>
            <div className={cn(styles.browser, mobile && styles.mobileBrowser)}>
              <div className={styles.browserBar}>
                <span className="flex gap-1">
                  <i />
                  <i />
                  <i />
                </span>
                <span>{path}</span>
                <span className="text-[9px]">
                  {published ? "LIVE + DRAFT" : "DRAFT"}
                </span>
              </div>
              <div
                className={cn(styles.canvas, !preview && styles.editable)}
                data-selection={selected}
                onClickCapture={canvasClick}
                onBlurCapture={(event) => {
                  const field = event.target.dataset.editField;
                  if (field === "headline" || field === "description") {
                    const value = event.target.textContent ?? "";
                    update(
                      field,
                      value.slice(0, field === "headline" ? 160 : 1000),
                    );
                  }
                }}
                onKeyDownCapture={(event) => {
                  if (
                    event.key === "Enter" &&
                    event.target instanceof HTMLElement &&
                    event.target.dataset.landingSection &&
                    !preview
                  ) {
                    event.preventDefault();
                    select(
                      event.target.dataset.landingSection as EditorSection,
                    );
                  }
                }}
              >
                <OrganizationLandingPage
                  data={{
                    organization: initial.organization,
                    config,
                    courses: initial.courses,
                  }}
                  preview={!preview}
                />
              </div>
            </div>
            <p className="text-muted-foreground mx-auto mt-5 max-w-md text-center text-[10px]">
              {preview
                ? "Pratinjau draft. Link dinonaktifkan agar Anda tetap di studio."
                : "Klik bagian untuk mengedit · Klik judul untuk mengetik langsung"}
            </p>
          </div>
          <div className={styles.statusBar}>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  published ? "bg-emerald-500" : "bg-muted-foreground",
                )}
              />
              {published
                ? "Halaman dipublikasikan"
                : "Hanya Anda yang dapat melihat draft ini"}
            </span>
            <span>{mobile ? "390 px" : "Responsif"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
