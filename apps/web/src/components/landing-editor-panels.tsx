"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  EyeIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { CopyButton } from "~/components/ui/copy-button";
import { Button } from "~/components/ui/button";
import { Kicker } from "~/components/brand/typography";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  getManagedOrganizationLandingImageKey,
  MAX_ORGANIZATION_LANDING_IMAGE_SIZE,
  organizationLandingImageContentTypes,
  type OrganizationLandingImageContentType,
} from "~/lib/organization-landing-image";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type LandingDraft = RouterOutputs["organizationLanding"]["get"];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function formatTime(value: Date) {
  return value.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const sectionNames: Record<string, string> = {
  seo: "SEO (hasil pencarian)",
  nav: "Navigasi",
  hero: "Bagian pembuka",
  about: "Tentang lembaga",
  courses: "Daftar kursus",
  features: "Keunggulan",
  testimonials: "Testimoni",
  faq: "FAQ",
  cta: "Ajakan",
  contact: "Kontak",
  footer: "Footer",
};

const fieldNames: Record<string, string> = {
  title: "Judul",
  heading: "Judul",
  subtitle: "Subjudul",
  description: "Deskripsi",
  body: "Isi teks",
  text: "Teks",
  eyebrow: "Label kecil di atas judul",
  cta: "Tombol",
  button: "Tombol",
  brand: "Nama brand",
  label: "Label",
  name: "Nama",
  quote: "Kutipan",
};

/** "starting-price" → "Starting price", for keys outside the known names. */
function readable(part: string) {
  const words = part.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * The section and field of a copy key such as `hero.title`, named for
 * people: "Bagian pembuka" and "Judul".
 */
function describeKey(key: string) {
  const [section = "", ...rest] = key.split(".");
  const field = rest.join(".");
  return {
    section: sectionNames[section] ?? readable(section),
    field: field
      ? (fieldNames[field] ?? readable(field.split(".").join(" ")))
      : "Teks",
  };
}

export function LandingCopyPanel({
  fields,
  edits,
  activeKey,
  onChange,
  onFocus,
}: {
  fields: LandingDraft["fields"];
  edits: Record<string, string>;
  activeKey: string | null;
  onChange: (key: string, value: string) => void;
  onFocus: (key: string) => void;
}) {
  if (!fields.length)
    return (
      <p className="text-muted-foreground text-sm">
        Halaman ini belum punya teks yang bisa diedit.
      </p>
    );
  return (
    <div className="grid gap-4">
      {fields.map((field, index) => {
        const value = edits[field.key] ?? field.text;
        const { section, field: name } = describeKey(field.key);
        // Fields come in page order; name each section where it starts.
        const startsSection =
          index === 0 ||
          describeKey(fields[index - 1]!.key).section !== section;
        return (
          <div key={field.key} className="grid gap-1.5">
            {startsSection ? (
              <Kicker className={cn(index > 0 && "mt-4")}>{section}</Kicker>
            ) : null}
            <Label htmlFor={`copy-${field.key}`} className="text-xs">
              {name}
            </Label>
            <Textarea
              id={`copy-${field.key}`}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
              onFocus={() => onFocus(field.key)}
              className={cn(
                // Grows with its content; short copy stays one line.
                "min-h-10",
                field.key in edits && "border-primary",
                field.key === activeKey && "ring-primary/30 ring-2",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

export function LandingAiPanel({
  organizationId,
  draft,
}: {
  organizationId: string;
  draft: LandingDraft;
}) {
  const connection = api.account.getMcpConnectionInfo.useQuery();
  const prompt = `Desain ulang landing page ${draft.organization.name} dengan tool Hakgyo (organizationId: ${organizationId}). Baca get_landing_page_guidelines dan get_landing_page_context dulu, lalu simpan hasilnya dengan update_landing_page_draft.`;
  return (
    <div className="grid gap-5 text-sm">
      <p className="text-muted-foreground">
        Minta Claude, ChatGPT, atau AI client lain yang mendukung MCP untuk
        mendesain halaman ini. Setiap hasil AI muncul di pratinjau secara
        otomatis, dan halaman live baru berubah setelah kamu publikasikan.
      </p>
      <ol className="grid gap-4">
        <li className="grid gap-2">
          <p className="font-medium">1. Hubungkan MCP server Hakgyo</p>
          {connection.data ? (
            <div className="flex items-center gap-2">
              <code className="bg-muted min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-xs">
                {connection.data.resource}
              </code>
              <CopyButton value={connection.data.resource} label="URL MCP" />
            </div>
          ) : (
            <LoaderCircleIcon className="size-4 animate-spin" />
          )}
          <Link
            href={`/workspace/${draft.organization.slug}/settings/mcp`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Panduan menghubungkan AI client
          </Link>
        </li>
        <li className="grid gap-2">
          <p className="font-medium">2. Kirim prompt ini</p>
          <p className="bg-muted rounded-md p-3 text-xs leading-relaxed">
            {prompt}
          </p>
          <div>
            <CopyButton value={prompt} label="Prompt" />
          </div>
        </li>
        <li>
          <p className="font-medium">3. Tinjau, edit teks, lalu publikasikan</p>
        </li>
      </ol>
    </div>
  );
}

export function LandingImagesPanel({
  organizationId,
  images,
}: {
  organizationId: string;
  images: string[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();
  const createUpload =
    api.storage.createOrganizationLandingImageUploadUrl.useMutation();
  const confirmUpload =
    api.storage.confirmOrganizationLandingImageUpload.useMutation();
  const discardUpload =
    api.storage.discardOrganizationLandingImageUpload.useMutation();
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    const contentType = file.type as OrganizationLandingImageContentType;
    if (!organizationLandingImageContentTypes.includes(contentType)) {
      toast.error("Gunakan gambar JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_ORGANIZATION_LANDING_IMAGE_SIZE) {
      toast.error("Ukuran gambar maksimal 10 MB.");
      return;
    }
    setUploading(true);
    let uploadedKey: string | null = null;
    try {
      const signed = await createUpload.mutateAsync({
        organizationId,
        purpose: "hero",
        contentType,
        fileSize: file.size,
      });
      uploadedKey = signed.key;
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: signed.headers,
      });
      if (!response.ok)
        throw new Error(`Upload gambar gagal (${response.status}).`);
      await confirmUpload.mutateAsync({
        organizationId,
        purpose: "hero",
        key: signed.key,
      });
      uploadedKey = null;
      await utils.organizationLanding.get.invalidate({ organizationId });
      toast.success("Gambar ditambahkan. AI sekarang bisa memakainya.");
    } catch (error) {
      if (uploadedKey)
        await discardUpload
          .mutateAsync({ organizationId, key: uploadedKey })
          .catch(() => undefined);
      toast.error(errorMessage(error, "Gambar gagal diunggah."));
    } finally {
      setUploading(false);
    }
  }

  async function remove(imageUrl: string) {
    const key = getManagedOrganizationLandingImageKey(imageUrl, organizationId);
    if (!key) return;
    try {
      await discardUpload.mutateAsync({ organizationId, key });
      await utils.organizationLanding.get.invalidate({ organizationId });
      toast.success("Gambar dihapus.");
    } catch (error) {
      toast.error(errorMessage(error, "Gambar gagal dihapus."));
    }
  }

  return (
    <div className="grid gap-4 text-sm">
      <p className="text-muted-foreground">
        Unggah foto kelas, pengajar, atau suasana belajar. AI hanya boleh
        memakai gambar dari sini.
      </p>
      <input
        ref={input}
        type="file"
        hidden
        accept={organizationLandingImageContentTypes.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button
        variant="outline"
        disabled={uploading}
        onClick={() => input.current?.click()}
      >
        {uploading ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <ImagePlusIcon />
        )}
        Unggah gambar
      </Button>
      <div className="grid grid-cols-2 gap-3">
        {images.map((imageUrl) => (
          <figure key={imageUrl} className="grid gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- R2 URLs chosen by the owner */}
            <img
              src={imageUrl}
              alt=""
              className="aspect-[4/3] w-full rounded-md border object-cover"
            />
            <div className="flex gap-1">
              <CopyButton value={imageUrl} label="URL gambar" />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Hapus gambar"
                disabled={discardUpload.isPending}
                onClick={() => void remove(imageUrl)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}

const sourceLabels = {
  MCP: "AI",
  EDITOR: "Editor",
  RESTORE: "Pemulihan",
} as const;

export type LandingRevision =
  RouterOutputs["organizationLanding"]["revisions"][number];

/**
 * A live miniature of a revision: the sandboxed preview document rendered at
 * four times the card width and scaled down, so it shows the desktop layout.
 */
function RevisionThumbnail({
  organizationId,
  revisionId,
  label,
  selected,
  onSelect,
}: {
  organizationId: string;
  revisionId: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative block aspect-[16/10] w-full overflow-hidden rounded-md border bg-white transition",
        "hover:ring-primary/40 focus-visible:ring-ring/50 outline-none hover:ring-2 focus-visible:ring-3",
        selected && "ring-primary ring-2",
      )}
    >
      <iframe
        src={`/api/organization-landing/draft/${encodeURIComponent(organizationId)}?preview=${encodeURIComponent(revisionId)}`}
        title=""
        aria-hidden
        tabIndex={-1}
        loading="lazy"
        sandbox="allow-scripts"
        className="pointer-events-none absolute top-0 left-0 h-[400%] w-[400%] origin-top-left scale-25"
      />
    </button>
  );
}

export function LandingRevisionsPanel({
  organizationId,
  draft,
  previewId,
  canRestore,
  restoring,
  clearing,
  onPreview,
  onRestore,
  onClear,
}: {
  organizationId: string;
  draft: LandingDraft;
  previewId: string | null;
  canRestore: boolean;
  restoring: boolean;
  clearing: boolean;
  onPreview: (revision: LandingRevision | null) => void;
  onRestore: (revisionId: string) => void;
  onClear: () => void;
}) {
  const revisions = api.organizationLanding.revisions.useQuery({
    organizationId,
  });
  if (revisions.isPending)
    return <LoaderCircleIcon className="size-4 animate-spin" />;
  if (!revisions.data?.length)
    return (
      <p className="text-muted-foreground text-sm">
        Belum ada revisi. Revisi dibuat setiap kali AI atau editor menyimpan
        draft.
      </p>
    );
  // The current draft and live revisions are kept when history is cleared.
  const clearable = revisions.data.filter(
    (revision) =>
      revision.id !== draft.revisionId &&
      revision.id !== draft.publishedRevisionId,
  ).length;
  return (
    <div className="grid gap-3 text-sm">
      <ul className="grid gap-3">
        {revisions.data.map((revision) => {
          const isDraft = revision.id === draft.revisionId;
          const previewing = isDraft ? !previewId : revision.id === previewId;
          return (
            <li
              key={revision.id}
              className={cn(
                "grid gap-1.5 rounded-lg border p-3 transition-colors",
                previewing && "border-primary bg-primary/5",
              )}
            >
              <RevisionThumbnail
                organizationId={organizationId}
                revisionId={revision.id}
                label={`Lihat revisi ${formatTime(revision.createdAt)}`}
                selected={previewing}
                onSelect={() => onPreview(isDraft ? null : revision)}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">
                  {sourceLabels[revision.source]}
                </Badge>
                {isDraft && <Badge variant="outline">Draft saat ini</Badge>}
                {revision.id === draft.publishedRevisionId && (
                  <Badge>Live</Badge>
                )}
                {previewing && (
                  <Badge variant="outline" className="text-primary">
                    <EyeIcon />
                    Sedang dilihat
                  </Badge>
                )}
              </div>
              {revision.summary && <p>{revision.summary}</p>}
              <p className="text-muted-foreground text-xs">
                {formatTime(revision.createdAt)}
                {revision.createdBy ? ` · ${revision.createdBy.name}` : ""}
              </p>
              {!isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  disabled={!canRestore || restoring}
                  onClick={() => onRestore(revision.id)}
                >
                  <RotateCcwIcon />
                  Pulihkan
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {clearable > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive justify-self-start"
          disabled={clearing}
          onClick={onClear}
        >
          {clearing ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <Trash2Icon />
          )}
          Hapus riwayat ({clearable})
        </Button>
      )}
    </div>
  );
}
