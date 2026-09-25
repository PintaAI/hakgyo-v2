"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  LoaderCircleIcon,
  SaveIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { OrganizationThemeSettings } from "~/components/organization-theme-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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
type PermissionMode = "SIMPLE" | "ADVANCED";

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

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
      {children}
    </span>
  );
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
  const generateTheme = api.organization.generateTheme.useMutation();

  const [name, setName] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode | null>(
    null,
  );
  const [teacherCanCreateCourse, setTeacherCanCreateCourse] = useState<
    boolean | null
  >(null);
  const [permissionMode, setPermissionMode] = useState<PermissionMode | null>(
    null,
  );

  const logoBusy =
    createLogoUpload.isPending ||
    confirmLogoUpload.isPending ||
    discardLogoUpload.isPending ||
    deleteLogo.isPending ||
    generateTheme.isPending;
  const preferencesBusy = updateOrganization.isPending;

  async function refreshOrganization() {
    await Promise.all([
      utils.organization.get.invalidate({ organizationId }),
      utils.organization.list.invalidate(),
    ]);
    router.refresh();
  }

  async function handleProfileSave() {
    if (!organization.data) return;
    const nextName = (name ?? organization.data.name).trim();
    const nextSlug = (slug ?? organization.data.slug).trim();
    if (!nextName || !nextSlug) {
      toast.error("Nama dan slug organisasi wajib diisi.");
      return;
    }

    try {
      await updateOrganization.mutateAsync({
        organizationId,
        name: nextName,
        slug: nextSlug,
      });
      setName(null);
      setSlug(null);
      await Promise.all([
        utils.organization.get.invalidate({ organizationId }),
        utils.organization.list.invalidate(),
      ]);
      if (nextSlug !== organizationSlug) {
        router.replace(`/workspace/${nextSlug}/settings/general`);
      } else {
        router.refresh();
      }
      toast.success("Profil organisasi disimpan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleEnrollmentChange(checked: boolean) {
    if (!organization.data) return;
    const next: EnrollmentMode = checked ? "OPEN" : "INVITE_ONLY";
    const previous = enrollmentMode ?? organization.data.defaultEnrollmentMode;
    setEnrollmentMode(next);
    try {
      await updateOrganization.mutateAsync({
        organizationId,
        defaultEnrollmentMode: next,
      });
      await refreshOrganization();
      toast.success("Pengaturan pendaftaran disimpan.");
    } catch (error) {
      setEnrollmentMode(previous);
      toast.error(errorMessage(error));
    }
  }

  async function handlePermissionModeChange(checked: boolean) {
    if (!organization.data) return;
    const next: PermissionMode = checked ? "ADVANCED" : "SIMPLE";
    const previous = permissionMode ?? organization.data.permissionMode;
    setPermissionMode(next);
    try {
      await updateOrganization.mutateAsync({
        organizationId,
        permissionMode: next,
      });
      await refreshOrganization();
      toast.success("Mode akses disimpan.");
    } catch (error) {
      setPermissionMode(previous);
      toast.error(errorMessage(error));
    }
  }

  async function handleTeacherCanCreateCourseChange(checked: boolean) {
    if (!organization.data) return;
    const previous =
      teacherCanCreateCourse ?? organization.data.teacherCanCreateCourse;
    setTeacherCanCreateCourse(checked);
    try {
      await updateOrganization.mutateAsync({
        organizationId,
        teacherCanCreateCourse: checked,
      });
      await refreshOrganization();
      toast.success("Pengaturan teacher disimpan.");
    } catch (error) {
      setTeacherCanCreateCourse(previous);
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
      try {
        await generateTheme.mutateAsync({ organizationId });
      } catch (themeError) {
        await refreshOrganization();
        toast.success("Logo organisasi diperbarui.");
        toast.error(errorMessage(themeError));
        return;
      }
      await refreshOrganization();
      toast.success("Logo dan tema organisasi diperbarui.");
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
      await refreshOrganization();
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

  const effectiveName = name ?? organization.data.name;
  const effectiveSlug = slug ?? organization.data.slug;
  const isProfileDirty =
    effectiveName.trim() !== organization.data.name ||
    effectiveSlug.trim() !== organization.data.slug;
  const effectiveEnrollmentMode =
    enrollmentMode ?? organization.data.defaultEnrollmentMode;
  const effectiveTeacherCanCreateCourse =
    teacherCanCreateCourse ?? organization.data.teacherCanCreateCourse;
  const effectivePermissionMode =
    permissionMode ?? organization.data.permissionMode;
  const isOwner = organization.data.currentRole === "OWNER";

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
          Kelola identitas workspace, tampilan, pendaftaran course, dan hak
          akses member.
        </p>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <SectionIcon>
              <Building2Icon className="size-4" />
            </SectionIcon>
            <div className="grid gap-1">
              <CardTitle>Profil workspace</CardTitle>
              <CardDescription>
                Nama dan slug mengidentifikasi workspace ini di seluruh Hakgyo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-5">
          <div className="grid gap-2">
            <Label htmlFor="organization-name">Nama</Label>
            <Input
              id="organization-name"
              value={effectiveName}
              maxLength={120}
              required
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Nama tampilan yang dilihat member dan siswa.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="organization-slug">Slug</Label>
            <Input
              id="organization-slug"
              value={effectiveSlug}
              minLength={2}
              maxLength={80}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className="font-mono"
              required
              onChange={(event) => setSlug(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Gunakan huruf kecil, angka, dan tanda hubung tunggal. Slug harus
              unik di seluruh Hakgyo.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={handleProfileSave}
            disabled={!isProfileDirty || updateOrganization.isPending}
          >
            {updateOrganization.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            Simpan profil
          </Button>
        </CardFooter>
      </Card>

      {/* Logo & tema */}
      <OrganizationThemeSettings
        accept={organizationLogoContentTypes.join(",")}
        enabled={organization.data.themeEnabled}
        logoBusy={logoBusy}
        logoName={organization.data.name}
        logoUrl={organization.data.logoUrl}
        onRemoveLogo={removeLogo}
        onUploadLogo={uploadLogo}
        organizationId={organizationId}
        theme={organization.data.theme}
      />

      {/* Pendaftaran & hak akses */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <SectionIcon>
              <ShieldCheckIcon className="size-4" />
            </SectionIcon>
            <div className="grid gap-1">
              <CardTitle>Pendaftaran &amp; hak akses</CardTitle>
              <CardDescription>
                Visibilitas default course baru dan siapa yang dapat mengelola
                course serta konten.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between gap-6 py-4">
            <div className="grid gap-0.5">
              <Label htmlFor="open-enrollment">
                Public course secara default
              </Label>
              <p className="text-muted-foreground text-xs">
                {effectiveEnrollmentMode === "OPEN"
                  ? "Course baru bisa ditemukan dan diikuti siswa."
                  : "Course baru hanya untuk siswa yang diundang."}
              </p>
            </div>
            <Switch
              id="open-enrollment"
              checked={effectiveEnrollmentMode === "OPEN"}
              disabled={preferencesBusy}
              onCheckedChange={(checked) => void handleEnrollmentChange(checked)}
              aria-label="Jadikan course publik secara default"
            />
          </div>

          <div className="flex items-center justify-between gap-6 border-t py-4">
            <div className="grid gap-0.5">
              <Label htmlFor="advanced-permissions">
                Permission lanjutan
              </Label>
              <p className="text-muted-foreground text-xs">
                {effectivePermissionMode === "ADVANCED"
                  ? "Akses course diatur per role dan assignment."
                  : "Semua member dapat mengelola semua course."}
              </p>
            </div>
            {isOwner ? (
              <Switch
                id="advanced-permissions"
                checked={effectivePermissionMode === "ADVANCED"}
                disabled={preferencesBusy}
                onCheckedChange={(checked) =>
                  void handlePermissionModeChange(checked)
                }
              />
            ) : (
              <span className="text-muted-foreground text-xs font-medium">
                Hanya owner
              </span>
            )}
          </div>

          {effectivePermissionMode === "ADVANCED" ? (
            <div className="flex items-center justify-between gap-6 border-t py-4">
              <div className="grid gap-0.5">
                <Label htmlFor="teacher-create-course">
                  Teacher boleh membuat course
                </Label>
                <p className="text-muted-foreground text-xs">
                  Pembuat course otomatis menjadi manager-nya.
                </p>
              </div>
              <Switch
                id="teacher-create-course"
                checked={effectiveTeacherCanCreateCourse}
                disabled={preferencesBusy}
                onCheckedChange={(checked) =>
                  void handleTeacherCanCreateCourseChange(checked)
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
