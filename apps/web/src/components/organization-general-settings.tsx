"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, SaveIcon, Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { OrganizationThemeSettings } from "~/components/organization-theme-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ImageUpload } from "~/components/ui/image-upload";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  MAX_ORGANIZATION_LOGO_SIZE,
  organizationLogoContentTypes,
  type OrganizationLogoContentType,
} from "~/lib/organization-logo";
import { processOrganizationLogo } from "~/lib/organization-logo-processing";
import { api } from "~/trpc/react";

type EnrollmentMode = "OPEN" | "INVITE_ONLY";

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function OrganizationGeneralSettings({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const organization = api.organization.get.useQuery({ organizationId });
  const updateOrganization = api.organization.update.useMutation();
  const createLogoUpload =
    api.storage.createOrganizationLogoUploadUrl.useMutation();
  const confirmLogoUpload =
    api.storage.confirmOrganizationLogoUpload.useMutation();
  const discardLogoUpload =
    api.storage.discardOrganizationLogoUpload.useMutation();
  const deleteLogo = api.storage.deleteOrganizationLogo.useMutation();
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode | null>(
    null,
  );
  const [teacherCanCreateCourse, setTeacherCanCreateCourse] = useState<
    boolean | null
  >(null);
  const [permissionMode, setPermissionMode] = useState<
    "SIMPLE" | "ADVANCED" | null
  >(null);
  const logoBusy =
    createLogoUpload.isPending ||
    confirmLogoUpload.isPending ||
    discardLogoUpload.isPending ||
    deleteLogo.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization.data) return;

    const formData = new FormData(event.currentTarget);
    const nameValue = formData.get("name");
    const slugValue = formData.get("slug");
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    const slug = typeof slugValue === "string" ? slugValue.trim() : "";
    if (!name || !slug) {
      toast.error("Nama dan slug organisasi wajib diisi.");
      return;
    }

    try {
      await updateOrganization.mutateAsync({
        organizationId,
        name,
        slug,
        defaultEnrollmentMode:
          enrollmentMode ?? organization.data.defaultEnrollmentMode,
        permissionMode:
          organization.data.currentRole === "OWNER"
            ? (permissionMode ?? organization.data.permissionMode)
            : undefined,
        teacherCanCreateCourse:
          teacherCanCreateCourse ?? organization.data.teacherCanCreateCourse,
      });
      await Promise.all([
        utils.organization.get.invalidate({ organizationId }),
        utils.organization.list.invalidate(),
      ]);
      if (slug !== organizationSlug) {
        router.replace(`/workspace/${slug}/settings/general`);
      } else {
        router.refresh();
      }
      toast.success("Pengaturan organisasi disimpan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function uploadLogo(file: File) {
    if (file.size <= 0 || file.size > MAX_ORGANIZATION_LOGO_SIZE) {
      toast.error("Logo organisasi maksimal 5 MB.");
      return;
    }
    if (
      !organizationLogoContentTypes.includes(
        file.type as OrganizationLogoContentType,
      )
    ) {
      toast.error("Gunakan gambar JPEG, PNG, WebP, atau GIF.");
      return;
    }

    let uploadedKey: string | null = null;
    try {
      const processedFile = await processOrganizationLogo(file);
      const upload = await createLogoUpload.mutateAsync({
        organizationId,
        contentType: processedFile.type as OrganizationLogoContentType,
        fileSize: processedFile.size,
      });
      uploadedKey = upload.key;
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        body: processedFile,
        headers: upload.headers,
      });
      if (!response.ok) {
        throw new Error(`Logo upload failed (${response.status}).`);
      }

      await confirmLogoUpload.mutateAsync({
        organizationId,
        key: upload.key,
      });
      uploadedKey = null;
      await Promise.all([
        utils.organization.get.invalidate({ organizationId }),
        utils.organization.list.invalidate(),
      ]);
      router.refresh();
      toast.success("Logo organisasi diperbarui.");
    } catch (error) {
      if (uploadedKey) {
        try {
          await discardLogoUpload.mutateAsync({
            organizationId,
            key: uploadedKey,
          });
        } catch {
          // Bucket lifecycle cleanup handles uploads that cannot be discarded.
        }
      }
      toast.error(errorMessage(error));
    }
  }

  async function removeLogo() {
    try {
      await deleteLogo.mutateAsync({ organizationId });
      await Promise.all([
        utils.organization.get.invalidate({ organizationId }),
        utils.organization.list.invalidate(),
      ]);
      router.refresh();
      toast.success("Logo organisasi dihapus.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (organization.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Memuat pengaturan
      </div>
    );
  }

  if (organization.error || !organization.data) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {organization.error?.message ?? "Organisasi gagal dimuat."}
        </p>
        <Button variant="outline" onClick={() => organization.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const effectiveEnrollmentMode =
    enrollmentMode ?? organization.data.defaultEnrollmentMode;
  const effectiveTeacherCanCreateCourse =
    teacherCanCreateCourse ?? organization.data.teacherCanCreateCourse;
  const effectivePermissionMode =
    permissionMode ?? organization.data.permissionMode;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Settings2Icon className="size-4" />
          Konfigurasi organisasi
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Pengaturan umum
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Kelola bagaimana organisasi Anda diidentifikasi, mengatur akses
          public/private course, dan berbagi sumber belajar dengan teacher.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Profile organisasi</CardTitle>
            <CardDescription>
              Detail ini mengidentifikasi workspace ini di seluruh Hakgyo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="organization-name">Nama</Label>
              <Input
                id="organization-name"
                name="name"
                defaultValue={organization.data.name}
                maxLength={120}
                required
              />
              <p className="text-muted-foreground text-xs">
                Nama tampilan yang dilihat member dan siswa.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="organization-logo">Logo organisasi</Label>
              <ImageUpload
                id="organization-logo"
                value={organization.data.logoUrl}
                alt={`Logo ${organization.data.name}`}
                accept={organizationLogoContentTypes.join(",")}
                helpText="JPEG, PNG, WebP, atau GIF. Maksimal 5 MB; otomatis diperkecil dan dikompresi."
                isPending={logoBusy}
                onUpload={uploadLogo}
                onRemove={removeLogo}
                replaceLabel="Ganti logo"
                removeLabel="Hapus logo"
                previewClassName="aspect-square w-20 rounded-xl"
                placeholder={
                  <span className="text-xl font-semibold">
                    {organization.data.name.charAt(0).toUpperCase()}
                  </span>
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="organization-slug">Slug</Label>
              <Input
                id="organization-slug"
                name="slug"
                defaultValue={organization.data.slug}
                minLength={2}
                maxLength={80}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                className="font-mono"
                required
              />
              <p className="text-muted-foreground text-xs">
                Gunakan huruf kecil, angka, dan tanda hubung tunggal. Slug harus
                unik di seluruh Hakgyo.
              </p>
            </div>

            <div className="flex items-start justify-between gap-6 rounded-xl border p-4">
              <div className="grid gap-1">
                <Label htmlFor="open-enrollment">
                  Public course secara default
                </Label>
                <p className="text-muted-foreground text-xs">
                  {effectiveEnrollmentMode === "OPEN"
                    ? "Course baru akan menjadi public — siswa dapat menemukan dan mendaftar sendiri."
                    : "Course baru akan menjadi private — hanya siswa yang diundang atau ditambahkan manual yang bisa mengakses."}{" "}
                  Setiap course dapat menimpa pengaturan ini.
                </p>
              </div>
              <Switch
                id="open-enrollment"
                checked={effectiveEnrollmentMode === "OPEN"}
                onCheckedChange={(checked) =>
                  setEnrollmentMode(checked ? "OPEN" : "INVITE_ONLY")
                }
                aria-label="Jadikan course publik secara default"
              />
            </div>

            <div className="grid gap-4 border-t pt-6">
              <div className="grid gap-1">
                <h2 className="text-sm font-semibold">Mode akses</h2>
                <p className="text-muted-foreground text-xs">
                  Mode sederhana memberi semua member akses penuh ke course dan
                  konten. Teacher hanya melihat Group belajar yang ditugaskan.
                </p>
              </div>

              <div className="flex items-start justify-between gap-6 rounded-xl border p-4">
                <div className="grid gap-1">
                  <Label htmlFor="advanced-permissions">
                    Gunakan permission lanjutan
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {effectivePermissionMode === "ADVANCED"
                      ? "Course owner, editor, dan role staff menentukan akses seperti sebelumnya."
                      : "Semua member dapat mengelola semua course. Admin dan owner mengatur assignment Group belajar."}
                  </p>
                </div>
                {organization.data.currentRole === "OWNER" ? (
                  <Switch
                    id="advanced-permissions"
                    checked={effectivePermissionMode === "ADVANCED"}
                    onCheckedChange={(checked) =>
                      setPermissionMode(checked ? "ADVANCED" : "SIMPLE")
                    }
                  />
                ) : (
                  <span className="text-muted-foreground text-xs font-medium">
                    Hanya owner
                  </span>
                )}
              </div>

              {effectivePermissionMode === "ADVANCED" ? (
                <div className="flex items-start justify-between gap-6 rounded-xl border p-4">
                  <div className="grid gap-1">
                    <Label htmlFor="teacher-create-course">
                      Teacher boleh membuat course
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Teacher yang membuat course otomatis menjadi manager
                      course tersebut. Akses course lain diberikan secara
                      eksplisit.
                    </p>
                  </div>
                  <Switch
                    id="teacher-create-course"
                    checked={effectiveTeacherCanCreateCourse}
                    onCheckedChange={setTeacherCanCreateCourse}
                  />
                </div>
              ) : null}
            </div>
          </CardContent>
          <div className="bg-muted/30 flex justify-end border-t p-4">
            <Button type="submit" disabled={updateOrganization.isPending}>
              {updateOrganization.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              Simpan perubahan
            </Button>
          </div>
        </Card>
      </form>

      <OrganizationThemeSettings
        enabled={organization.data.themeEnabled}
        logoUrl={organization.data.logoUrl}
        organizationId={organizationId}
        theme={organization.data.theme}
      />
    </div>
  );
}
