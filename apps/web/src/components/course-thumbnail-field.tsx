"use client";

import { useState } from "react";
import { LoaderCircleIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { CenteredImageUpload } from "~/components/ui/centered-image-upload";
import {
  courseThumbnailContentTypes,
  getManagedCourseThumbnailKey,
  MAX_COURSE_THUMBNAIL_SIZE,
  type CourseThumbnailContentType,
} from "~/lib/course-thumbnail";
import { getErrorMessage } from "~/lib/error-message";
import { api } from "~/trpc/react";

/** The one place to set a course thumbnail: upload, replace, remove, or AI. */
export function CourseThumbnailField({
  id,
  courseId,
  thumbnailUrl: savedUrl,
  onChange,
}: {
  id: string;
  courseId: string;
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
      toast.success("Thumbnail kursus diperbarui.");
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
      toast.success("Thumbnail kursus dihapus.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function generateWithAi() {
    try {
      const result = await generate.mutateAsync({ courseId });
      setThumbnailUrl(result.thumbnailUrl);
      await onChange();
      toast.success("Thumbnail kursus berhasil dibuat.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div data-thumbnail-field className="grid gap-2 lg:w-72">
      <CenteredImageUpload
        id={id}
        value={thumbnailUrl}
        alt="Thumbnail kursus"
        accept={courseThumbnailContentTypes.join(",")}
        busy={busy}
        onUpload={upload}
        onRemove={remove}
        uploadLabel="Unggah thumbnail"
        replaceLabel="Ganti thumbnail"
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void generateWithAi()}
          >
            {generate.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {generate.isPending ? "Membuat thumbnail..." : "Buat dengan AI"}
          </Button>
        }
      />
      <p className="text-muted-foreground text-center text-xs">
        Unggah gambar sendiri, atau biarkan AI membuatnya dari judul kursus dan
        warna lembaga Anda.
      </p>
    </div>
  );
}
