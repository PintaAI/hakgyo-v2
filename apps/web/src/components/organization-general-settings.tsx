"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ImageUpIcon,
  LoaderCircleIcon,
  SaveIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  return "Something went wrong. Please try again.";
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode | null>(
    null,
  );
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
      toast.error("Organization name and slug are required.");
      return;
    }

    try {
      await updateOrganization.mutateAsync({
        organizationId,
        name,
        slug,
        defaultEnrollmentMode:
          enrollmentMode ?? organization.data.defaultEnrollmentMode,
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
      toast.success("Organization settings saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function uploadLogo() {
    if (!logoFile) {
      toast.error("Choose an image first.");
      return;
    }
    if (logoFile.size > MAX_ORGANIZATION_LOGO_SIZE) {
      toast.error("Organization logos must be 5 MB or smaller.");
      return;
    }
    if (
      !organizationLogoContentTypes.includes(
        logoFile.type as OrganizationLogoContentType,
      )
    ) {
      toast.error("Use a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    let uploadedKey: string | null = null;
    try {
      const upload = await createLogoUpload.mutateAsync({
        organizationId,
        contentType: logoFile.type as OrganizationLogoContentType,
        fileSize: logoFile.size,
      });
      uploadedKey = upload.key;
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        body: logoFile,
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
      setLogoFile(null);
      router.refresh();
      toast.success("Organization logo updated.");
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
      setLogoFile(null);
      router.refresh();
      toast.success("Organization logo removed.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (organization.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Loading settings
      </div>
    );
  }

  if (organization.error || !organization.data) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {organization.error?.message ?? "Organization could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => organization.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const effectiveEnrollmentMode =
    enrollmentMode ?? organization.data.defaultEnrollmentMode;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <Settings2Icon className="size-4" />
          Organization configuration
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          General settings
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Manage how your organization is identified and how new courses handle
          enrollment by default.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Organization profile</CardTitle>
            <CardDescription>
              These details identify this workspace across Hakgyo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="organization-name">Name</Label>
              <Input
                id="organization-name"
                name="name"
                defaultValue={organization.data.name}
                maxLength={120}
                required
              />
              <p className="text-muted-foreground text-xs">
                The display name shown to members and learners.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
              <Avatar className="size-16 rounded-xl after:rounded-xl">
                {organization.data.logoUrl ? (
                  <AvatarImage
                    src={organization.data.logoUrl}
                    alt={`${organization.data.name} logo`}
                    className="rounded-xl"
                  />
                ) : null}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground rounded-xl text-xl font-semibold">
                  {organization.data.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 gap-2">
                <Label htmlFor="organization-logo">Organization logo</Label>
                <Input
                  id="organization-logo"
                  type="file"
                  accept={organizationLogoContentTypes.join(",")}
                  disabled={logoBusy}
                  key={organization.data.logoUrl ?? "no-organization-logo"}
                  onChange={(event) =>
                    setLogoFile(event.target.files?.[0] ?? null)
                  }
                />
                <p className="text-muted-foreground text-xs">
                  JPEG, PNG, WebP, or GIF. Maximum 5 MB.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={logoBusy || !logoFile}
                    onClick={() => void uploadLogo()}
                  >
                    {createLogoUpload.isPending ||
                    confirmLogoUpload.isPending ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <ImageUpIcon />
                    )}
                    Upload logo
                  </Button>
                  {organization.data.logoUrl ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={logoBusy}
                      onClick={() => void removeLogo()}
                    >
                      {deleteLogo.isPending ? (
                        <LoaderCircleIcon className="animate-spin" />
                      ) : (
                        <Trash2Icon />
                      )}
                      Remove logo
                    </Button>
                  ) : null}
                </div>
              </div>
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
                Use lowercase letters, numbers, and single hyphens. Slugs must
                be unique across Hakgyo.
              </p>
            </div>

            <div className="flex items-start justify-between gap-6 rounded-xl border p-4">
              <div className="grid gap-1">
                <Label htmlFor="open-enrollment">Allow open enrollment</Label>
                <p className="text-muted-foreground text-xs">
                  {effectiveEnrollmentMode === "OPEN"
                    ? "Learners can enroll themselves in eligible courses by default."
                    : "Learners need an invite or manual enrollment by default."}{" "}
                  Courses can override this setting.
                </p>
              </div>
              <Switch
                id="open-enrollment"
                checked={effectiveEnrollmentMode === "OPEN"}
                onCheckedChange={(checked) =>
                  setEnrollmentMode(checked ? "OPEN" : "INVITE_ONLY")
                }
                aria-label="Allow open enrollment"
              />
            </div>
          </CardContent>
          <div className="bg-muted/30 flex justify-end border-t p-4">
            <Button type="submit" disabled={updateOrganization.isPending}>
              {updateOrganization.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              Save changes
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
