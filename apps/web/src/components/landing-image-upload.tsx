"use client";

import { useId } from "react";
import { toast } from "sonner";

import { ImageUpload } from "~/components/ui/image-upload";
import { Label } from "~/components/ui/label";
import {
  getManagedOrganizationLandingImageKey,
  MAX_ORGANIZATION_LANDING_IMAGE_SIZE,
  organizationLandingImageContentTypes,
  type OrganizationLandingImageContentType,
  type OrganizationLandingImagePurpose,
} from "~/lib/organization-landing-image";
import { api } from "~/trpc/react";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Gambar gagal diunggah. Silakan coba lagi.";
}

export function LandingImageUpload({
  organizationId,
  purpose,
  value,
  label,
  helpText,
  onChange,
}: {
  organizationId: string;
  purpose: OrganizationLandingImagePurpose;
  value: string;
  label: string;
  helpText: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const createUpload =
    api.storage.createOrganizationLandingImageUploadUrl.useMutation();
  const confirmUpload =
    api.storage.confirmOrganizationLandingImageUpload.useMutation();
  const discardUpload =
    api.storage.discardOrganizationLandingImageUpload.useMutation();
  const isPending =
    createUpload.isPending ||
    confirmUpload.isPending ||
    discardUpload.isPending;

  async function discard(key: string) {
    await discardUpload
      .mutateAsync({ organizationId, key })
      .catch(() => undefined);
  }

  async function upload(file: File) {
    if (
      !organizationLandingImageContentTypes.includes(
        file.type as OrganizationLandingImageContentType,
      )
    ) {
      toast.error("Gunakan gambar JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_ORGANIZATION_LANDING_IMAGE_SIZE) {
      toast.error("Ukuran gambar maksimal 10 MB.");
      return;
    }

    const previousKey = getManagedOrganizationLandingImageKey(
      value,
      organizationId,
    );
    let uploadedKey: string | null = null;
    try {
      const signed = await createUpload.mutateAsync({
        organizationId,
        purpose,
        contentType: file.type as OrganizationLandingImageContentType,
        fileSize: file.size,
      });
      uploadedKey = signed.key;
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: signed.headers,
      });
      if (!response.ok) {
        throw new Error(`Upload gambar gagal (${response.status}).`);
      }
      const confirmed = await confirmUpload.mutateAsync({
        organizationId,
        purpose,
        key: signed.key,
      });
      uploadedKey = null;
      onChange(confirmed.imageUrl);
      if (previousKey && previousKey !== confirmed.key) {
        await discard(previousKey);
      }
      toast.success(
        "Gambar tersimpan di R2. Simpan draft untuk menerapkannya.",
      );
    } catch (error) {
      if (uploadedKey) await discard(uploadedKey);
      toast.error(errorMessage(error));
    }
  }

  async function remove() {
    const key = getManagedOrganizationLandingImageKey(value, organizationId);
    onChange("");
    if (key) await discard(key);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <ImageUpload
        id={id}
        value={value}
        alt=""
        accept={organizationLandingImageContentTypes.join(",")}
        helpText={helpText}
        onUpload={upload}
        onRemove={remove}
        isPending={isPending}
        uploadLabel="Unggah gambar"
        replaceLabel="Ganti gambar"
        removeLabel="Hapus"
        className="grid p-2"
        previewClassName="aspect-[16/10] w-full max-w-none"
      />
    </div>
  );
}
