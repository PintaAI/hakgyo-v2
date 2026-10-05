"use client";

import { useRef, useState } from "react";
import {
  ImageIcon,
  LoaderCircleIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { CourseCover } from "~/components/course-cover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  courseThumbnailContentTypes,
  getManagedCourseThumbnailKey,
  MAX_COURSE_THUMBNAIL_SIZE,
  type CourseThumbnailContentType,
} from "~/lib/course-thumbnail";
import { getErrorMessage } from "~/lib/error-message";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/**
 * The course header cover, and the one place to set its thumbnail: clicking
 * it replaces the image, hovering offers AI generation, and the corner
 * button removes it.
 */
export function CourseCoverEditor({
  courseId,
  title,
  thumbnailUrl: savedUrl,
  onChange,
}: {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  /** Refreshes everything that shows the thumbnail. */
  onChange: () => Promise<void>;
}) {
  // Shown right away after a change, then follows the saved value.
  const [thumbnailUrl, setThumbnailUrl] = useState(savedUrl);
  const [loadedUrl, setLoadedUrl] = useState(savedUrl);
  if (savedUrl !== loadedUrl) {
    setLoadedUrl(savedUrl);
    setThumbnailUrl(savedUrl);
  }
  const inputRef = useRef<HTMLInputElement>(null);

  const updateCourse = api.course.update.useMutation();
  const createUpload = api.storage.createCourseThumbnailUploadUrl.useMutation();
  const confirmUpload = api.storage.confirmCourseThumbnailUpload.useMutation();
  const deleteThumbnail = api.storage.deleteCourseThumbnail.useMutation();
  const generate = api.course.generateThumbnail.useMutation();
  const busy =
    updateCourse.isPending ||
    createUpload.isPending ||
    confirmUpload.isPending ||
    deleteThumbnail.isPending ||
    generate.isPending;
  const replaceLabel = thumbnailUrl ? "Ganti thumbnail" : "Tambah thumbnail";

  function pickFile() {
    if (!busy) inputRef.current?.click();
  }

  function deleteStored(key: string) {
    return deleteThumbnail
      .mutateAsync({ courseId, key })
      .catch(() => undefined);
  }

  async function upload(file: File) {
    if (
      !courseThumbnailContentTypes.includes(
        file.type as CourseThumbnailContentType,
      )
    ) {
      toast.error("Gunakan gambar JPEG, PNG, WebP, atau GIF.");
      return;
    }
    if (file.size > MAX_COURSE_THUMBNAIL_SIZE) {
      toast.error("Thumbnail maksimal 5 MB.");
      return;
    }

    let uploadedKey: string | null = null;
    const previousKey = getManagedCourseThumbnailKey(thumbnailUrl, courseId);
    try {
      const target = await createUpload.mutateAsync({
        courseId,
        contentType: file.type as CourseThumbnailContentType,
        fileSize: file.size,
      });
      uploadedKey = target.key;
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        body: file,
        headers: target.headers,
      });
      if (!response.ok) {
        throw new Error(`Upload thumbnail gagal (${response.status}).`);
      }
      const confirmed = await confirmUpload.mutateAsync({
        courseId,
        key: target.key,
      });
      await updateCourse.mutateAsync({
        courseId,
        thumbnailUrl: confirmed.thumbnailUrl,
      });
      uploadedKey = null;
      setThumbnailUrl(confirmed.thumbnailUrl);
      await onChange();
      if (previousKey && previousKey !== confirmed.key) {
        await deleteStored(previousKey);
      }
      toast.success("Thumbnail kurikulum diperbarui.");
    } catch (error) {
      if (uploadedKey) await deleteStored(uploadedKey);
      toast.error(getErrorMessage(error));
    }
  }

  async function remove() {
    const key = getManagedCourseThumbnailKey(thumbnailUrl, courseId);
    try {
      await updateCourse.mutateAsync({ courseId, thumbnailUrl: null });
      if (key) await deleteStored(key);
      setThumbnailUrl(null);
      await onChange();
      toast.success("Thumbnail kurikulum dihapus.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function generateWithAi() {
    try {
      const result = await generate.mutateAsync({ courseId });
      setThumbnailUrl(result.thumbnailUrl);
      await onChange();
      toast.success("Thumbnail kurikulum berhasil dibuat.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="group/cover relative overflow-hidden rounded-2xl">
      <CourseCover
        title={title}
        thumbnailUrl={thumbnailUrl}
        priority
        sizes="352px"
        className="aspect-video w-full transition-transform duration-500 group-hover/cover:scale-[1.02]"
      />
      <input
        ref={inputRef}
        type="file"
        accept={courseThumbnailContentTypes.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      {/* The whole cover replaces the image; the buttons below are for keyboard and AI. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={busy}
        onClick={pickFile}
        className="absolute inset-0 cursor-pointer disabled:cursor-wait"
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-2 bg-black/50 p-3 opacity-0 transition-opacity duration-200 group-focus-within/cover:opacity-100 group-hover/cover:opacity-100 [@media(hover:none)]:bg-black/30 [@media(hover:none)]:opacity-100",
          busy && "opacity-100",
        )}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
            <LoaderCircleIcon className="size-4 animate-spin" />
            {generate.isPending ? "Membuat thumbnail..." : "Memproses..."}
          </span>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-auto"
              onClick={pickFile}
            >
              <ImageIcon data-icon="inline-start" />
              {replaceLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-auto"
              onClick={() => void generateWithAi()}
            >
              <SparklesIcon data-icon="inline-start" />
              Buat dengan AI
            </Button>
          </>
        )}
      </div>
      {thumbnailUrl && !busy ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                aria-label="Hapus thumbnail"
                className="text-destructive hover:text-destructive absolute top-2.5 right-2.5 shadow-sm"
              />
            }
          >
            <Trash2Icon />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus thumbnail kurikulum?</AlertDialogTitle>
              <AlertDialogDescription>
                Kurikulum akan kembali memakai cover bawaan sampai Anda
                menambahkan thumbnail baru.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void remove()}
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
