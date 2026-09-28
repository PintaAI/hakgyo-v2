"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  ClipboardIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

/** Human label for a copy key such as `hero.title` → "Hero · title". */
function fieldLabel(key: string) {
  return key.split(".").join(" · ");
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
      {fields.map((field) => {
        const value = edits[field.key] ?? field.text;
        return (
          <div key={field.key} className="grid gap-1.5">
            <Label
              htmlFor={`copy-${field.key}`}
              className="text-muted-foreground font-mono text-xs"
            >
              {fieldLabel(field.key)}
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
  const prompt = `Desain ulang landing page ${draft.organization.name} dengan tool Hakgyo (organizationId: ${organizationId}). Baca hakgyo.landing.get_guidelines dan hakgyo.landing.get_context dulu, lalu simpan hasilnya dengan hakgyo.landing.update_draft.`;
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

export function LandingRevisionsPanel({
  organizationId,
  draft,
  canRestore,
  onRestored,
}: {
  organizationId: string;
  draft: LandingDraft;
  canRestore: boolean;
  onRestored: () => void;
}) {
  const revisions = api.organizationLanding.revisions.useQuery({
    organizationId,
  });
  const restore = api.organizationLanding.restoreRevision.useMutation({
    onSuccess: () => {
      toast.success("Revisi dipulihkan sebagai draft.");
      onRestored();
    },
    onError: (error) => toast.error(error.message),
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
  return (
    <ul className="grid gap-3 text-sm">
      {revisions.data.map((revision) => (
        <li key={revision.id} className="grid gap-1.5 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{sourceLabels[revision.source]}</Badge>
            {revision.id === draft.revisionId && (
              <Badge variant="outline">Draft saat ini</Badge>
            )}
            {revision.id === draft.publishedRevisionId && <Badge>Live</Badge>}
          </div>
          {revision.summary && <p>{revision.summary}</p>}
          <p className="text-muted-foreground text-xs">
            {formatTime(revision.createdAt)}
            {revision.createdBy ? ` · ${revision.createdBy.name}` : ""}
          </p>
          {revision.id !== draft.revisionId && (
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              disabled={!canRestore || restore.isPending}
              onClick={() =>
                restore.mutate({ organizationId, revisionId: revision.id })
              }
            >
              <RotateCcwIcon />
              Pulihkan
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
