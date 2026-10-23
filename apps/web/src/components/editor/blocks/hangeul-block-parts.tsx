"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  LoaderCircleIcon,
  UploadIcon,
  Volume2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAssetDownloadUrl } from "~/components/asset-download-url";
import { cn } from "~/lib/utils";

import { useEditorAssetUpload } from "../asset-upload-context";
import { CustomBlockToolbar } from "./custom-block-toolbar";
import { EditableBlockText } from "./editable-block-text";

// One clip plays at a time across every Hangeul block on the page, so tapping
// 사다 then 싸다 never overlaps the two.
let activeAudio: HTMLAudioElement | null = null;
let activeClip: string | null = null;
const clipListeners = new Set<() => void>();

function setActiveClip(clip: string | null) {
  activeClip = clip;
  clipListeners.forEach((listener) => listener());
}

function subscribeToClips(listener: () => void) {
  clipListeners.add(listener);
  return () => {
    clipListeners.delete(listener);
  };
}

function playClip(clip: string, url: string) {
  activeAudio?.pause();
  const audio = new Audio(url);
  activeAudio = audio;
  setActiveClip(clip);
  const finish = () => {
    if (activeAudio !== audio) return;
    activeAudio = null;
    setActiveClip(null);
  };
  audio.addEventListener("ended", finish);
  audio.addEventListener("pause", finish);
  audio.addEventListener("error", finish);
  audio.play().catch(() => {
    finish();
    toast.error("Audio gagal diputar.");
  });
}

/**
 * Signs the clip's URL when it mounts (requests made together are batched),
 * so a tap can start playback within the click, as Safari requires.
 */
export function useHangeulClip(assetId: string, clip: string) {
  const { url, failed, loading } = useAssetDownloadUrl(
    assetId,
    Boolean(assetId),
  );
  const playing = useSyncExternalStore(
    subscribeToClips,
    () => activeClip === clip,
    () => false,
  );
  const available = Boolean(assetId) && !failed;
  return {
    available,
    loading: available && loading,
    playing,
    play: () => {
      if (!url) return;
      if (playing) activeAudio?.pause();
      else playClip(clip, url);
    },
  };
}

/** A round play button for one clip; renders nothing without an asset. */
export function HangeulPlayButton({
  assetId,
  clip,
  label,
  size = "md",
  className,
}: {
  assetId: string;
  clip: string;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const audio = useHangeulClip(assetId, clip);
  if (!audio.available) return null;
  return (
    <button
      aria-label={audio.playing ? `Hentikan ${label}` : `Putar ${label}`}
      aria-pressed={audio.playing}
      className={cn(
        "bg-primary text-primary-foreground inline-grid shrink-0 place-items-center rounded-full transition hover:opacity-90 disabled:opacity-50",
        size === "sm" ? "size-8" : "size-10",
        audio.playing && "ring-primary/30 ring-4",
        className,
      )}
      disabled={audio.loading}
      onClick={audio.play}
      type="button"
    >
      {audio.loading ? (
        <LoaderCircleIcon className="size-4 animate-spin" />
      ) : (
        <Volume2Icon className={size === "sm" ? "size-3.5" : "size-4"} />
      )}
    </button>
  );
}

/**
 * Editor control that uploads an audio file for one clip, or removes it. The
 * caller stores only the asset id; the material links the file on save.
 */
export function HangeulClipUpload({
  assetId,
  label,
  onChange,
}: {
  assetId: string;
  label: string;
  onChange: (assetId: string) => void;
}) {
  const storage = useEditorAssetUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !storage) return;
    setUploading(true);
    try {
      const asset = await storage.upload(file, "audio");
      onChange(asset.assetId);
      toast.success("Audio diunggah.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload audio gagal.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!storage && !assetId) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <input
        ref={inputRef}
        accept="audio/*"
        className="hidden"
        onChange={(event) => void selectFile(event)}
        type="file"
      />
      {storage ? (
        <button
          aria-label={`${assetId ? "Ganti" : "Unggah"} audio ${label}`}
          className="border-border text-muted-foreground hover:bg-background hover:text-foreground inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[0.7rem] font-medium transition disabled:opacity-50"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? (
            <LoaderCircleIcon className="size-3 animate-spin" />
          ) : (
            <UploadIcon className="size-3" />
          )}
          {assetId ? "Ganti" : "Audio"}
        </button>
      ) : null}
      {assetId ? (
        <button
          aria-label={`Hapus audio ${label}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md transition"
          onClick={() => onChange("")}
          type="button"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

/**
 * Inline text that authors edit in place. Learners see nothing for an empty
 * value instead of a blank line.
 */
export function HangeulText({
  ariaLabel,
  className,
  editable,
  korean = false,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  className?: string;
  editable: boolean;
  korean?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  if (!editable && !value.trim()) return null;
  return (
    <div className="min-w-0" lang={korean ? "ko" : undefined}>
      <EditableBlockText
        ariaLabel={ariaLabel}
        className={className}
        editable={editable}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

/** The bar above a Hangeul block in the editor: its name and controls. */
export function HangeulEditorBar({
  block,
  children,
  icon: Icon,
  label,
  onClear,
}: {
  block: unknown;
  children?: ReactNode;
  icon: LucideIcon;
  label: string;
  onClear: () => void;
}) {
  return (
    <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <CustomBlockToolbar block={block} editable onClear={onClear} />
      </div>
    </div>
  );
}

export function HangeulToggleButton({
  icon: Icon,
  onClick,
  pressed,
  children,
}: {
  icon: LucideIcon;
  onClick: () => void;
  pressed: boolean;
  children: ReactNode;
}) {
  return (
    <button
      aria-pressed={pressed}
      className="border-border hover:bg-background text-muted-foreground hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition"
      onClick={onClick}
      type="button"
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}

/** A dashed full-width button that adds a row in the editor. */
export function HangeulAddButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-xs font-medium transition disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function HangeulRemoveButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 shrink-0 place-items-center rounded-md transition disabled:opacity-30"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <XIcon className="size-3.5" />
    </button>
  );
}

/** Padding of a Hangeul block's header and body: near edge to edge on phones. */
export const hangeulSectionPadding = "px-1 py-4 sm:p-6";

/** The block header: an accent bar, an icon and the editable title. */
export function HangeulBlockHeader({
  children,
  editable,
  eyebrow,
  icon: Icon,
  onTitleChange,
  title,
  titlePlaceholder,
}: {
  children?: ReactNode;
  editable: boolean;
  eyebrow: string;
  icon: LucideIcon;
  onTitleChange: (title: string) => void;
  title: string;
  titlePlaceholder: string;
}) {
  return (
    <header
      className={cn(
        "border-border relative min-w-0 border-b",
        hangeulSectionPadding,
      )}
    >
      <span
        aria-hidden="true"
        className="bg-primary absolute top-0 right-0 left-0 h-1"
      />
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary text-primary-foreground mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </div>
          <HangeulText
            ariaLabel="Judul block"
            className="text-foreground w-full text-xl leading-tight font-semibold tracking-tight sm:text-2xl"
            editable={editable}
            onChange={onTitleChange}
            placeholder={titlePlaceholder}
            value={title}
          />
          {children}
        </div>
      </div>
    </header>
  );
}
