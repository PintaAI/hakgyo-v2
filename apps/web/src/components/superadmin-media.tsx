"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FilmIcon,
  ImageIcon,
  LoaderCircleIcon,
  MusicIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { PageHeader } from "~/components/ui/page-header";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDialogs } from "~/components/ui/use-dialogs";
import { api, type RouterOutputs } from "~/trpc/react";

type Media = RouterOutputs["superadmin"]["media"]["list"];
type Item = Media["items"][number];

const folders = {
  video: { label: "Video", icon: FilmIcon },
  gambar: { label: "Gambar", icon: ImageIcon },
  audio: { label: "Audio", icon: MusicIcon },
  dokumen: { label: "Dokumen", icon: FileIcon },
  lainnya: { label: "Lainnya", icon: FileIcon },
} as const;
type Folder = keyof typeof folders;

function folderOf(file: File): Folder {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "gambar";
  if (file.type.startsWith("audio/")) return "audio";
  if (/pdf|document|sheet|presentation|text/.test(file.type)) return "dokumen";
  return "lainnya";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

/** PUTs a file to a signed URL, reporting progress (fetch has no upload progress). */
function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Unggah gagal (${request.status}).`));
    request.onerror = () =>
      reject(new Error("Unggah gagal. Periksa koneksi Anda."));
    request.send(file);
  });
}

export function SuperadminMedia({ initialData }: { initialData: Media }) {
  const utils = api.useUtils();
  const media = api.superadmin.media.list.useQuery(undefined, { initialData });
  const createUpload = api.superadmin.media.createUpload.useMutation();
  const downloadUrl = api.superadmin.media.downloadUrl.useMutation();
  const remove = api.superadmin.media.delete.useMutation();
  const { confirm, dialogs } = useDialogs();
  const fileInput = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<Folder | "semua">("semua");
  const [search, setSearch] = useState("");
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>(
    [],
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (media.data?.items ?? []).filter(
      (item) =>
        (folder === "semua" || item.folder === folder) &&
        (!query || item.name.toLowerCase().includes(query)),
    );
  }, [media.data, folder, search]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploads(list.map((file) => ({ name: file.name, progress: 0 })));
    let done = 0;
    for (const [index, file] of list.entries()) {
      try {
        const target = await createUpload.mutateAsync({
          folder: folderOf(file),
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });
        await putWithProgress(
          target.uploadUrl,
          file,
          target.headers,
          (fraction) =>
            setUploads((current) =>
              current.map((row, i) =>
                i === index ? { ...row, progress: fraction } : row,
              ),
            ),
        );
        done++;
      } catch (error) {
        toast.error(
          `${file.name}: ${error instanceof Error ? error.message : "Unggah gagal."}`,
        );
      }
    }
    setUploads([]);
    if (fileInput.current) fileInput.current.value = "";
    if (done) toast.success(`${done} file diunggah.`);
    await utils.superadmin.media.list.invalidate();
  }

  async function open(item: Item, disposition: "attachment" | "inline") {
    setBusyKey(item.key);
    try {
      const { url } = await downloadUrl.mutateAsync({
        key: item.key,
        disposition,
      });
      if (disposition === "inline") window.open(url, "_blank", "noopener");
      else window.location.assign(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Link gagal dibuat.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelete(item: Item) {
    const ok = await confirm({
      title: `Hapus ${item.name}?`,
      description:
        "File dihapus permanen dari storage dan tidak bisa dipulihkan.",
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    setBusyKey(item.key);
    try {
      await remove.mutateAsync({ key: item.key });
      toast.success("File dihapus.");
      await utils.superadmin.media.list.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "File gagal dihapus.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  const uploading = uploads.length > 0;
  const overall = uploading
    ? uploads.reduce((sum, row) => sum + row.progress, 0) / uploads.length
    : 0;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10">
      <Link
        href="/superadmin"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Superadmin
      </Link>
      <PageHeader
        eyebrow="Superadmin"
        title="Media Hakgyo"
        description="Video promosi, aset pemasaran, dan backup milik Hakgyo. Unggah, pratinjau, unduh, dan hapus file di sini."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void upload(event.target.files)}
            />
            <Button
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <UploadIcon data-icon="inline-start" />
              )}
              Unggah file
            </Button>
          </>
        }
      />

      {uploading ? (
        <section
          className="bg-card space-y-3 rounded-xl border p-5"
          aria-live="polite"
        >
          <p className="text-sm font-medium">
            Mengunggah {uploads.length} file · {Math.round(overall * 100)}%
          </p>
          <Progress value={overall * 100} aria-label="Progres unggahan" />
          <ul className="text-muted-foreground space-y-1 text-xs">
            {uploads.map((row) => (
              <li key={row.name}>
                {row.name} · {Math.round(row.progress * 100)}%
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            Biarkan halaman ini tetap terbuka sampai unggahan selesai.
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama file"
              aria-label="Cari nama file"
              className="pl-9"
            />
          </div>
          <Select
            value={folder}
            onValueChange={(value) => {
              if (value) setFolder(value);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Folder">
              <span className="flex flex-1 text-left">
                {folder === "semua" ? "Semua folder" : folders[folder].label}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua folder</SelectItem>
              {Object.entries(folders).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            {media.data?.items.length ?? 0} file ·{" "}
            {formatBytes(media.data?.totalBytes ?? 0)}
          </p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={FilmIcon}
            title={
              media.data?.items.length
                ? "Tidak ada file yang cocok"
                : "Belum ada media"
            }
            description={
              media.data?.items.length
                ? "Ubah pencarian atau folder."
                : "Unggah video atau aset pertama Hakgyo."
            }
          />
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead className="text-right">Ukuran</TableHead>
                  <TableHead>Diunggah</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const meta =
                    folders[item.folder as Folder] ?? folders.lainnya;
                  const Icon = meta.icon;
                  const busy = busyKey === item.key;
                  return (
                    <TableRow key={item.key}>
                      <TableCell className="max-w-md">
                        <span className="flex items-center gap-2 font-medium">
                          <Icon className="text-muted-foreground size-4 shrink-0" />
                          <span className="truncate" title={item.key}>
                            {item.name}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {meta.label}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBytes(item.size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy}
                            aria-label={`Pratinjau ${item.name}`}
                            onClick={() => void open(item, "inline")}
                          >
                            <EyeIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy}
                            aria-label={`Unduh ${item.name}`}
                            onClick={() => void open(item, "attachment")}
                          >
                            <DownloadIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy}
                            aria-label={`Hapus ${item.name}`}
                            onClick={() => void handleDelete(item)}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      {dialogs}
    </main>
  );
}
