"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  FileTextIcon,
  LoaderCircleIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { DynamicBlockNoteEditor } from "~/components/editor";
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
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { api, type RouterInputs } from "~/trpc/react";

type MaterialContent = RouterInputs["content"]["createMaterial"]["content"];

const EMPTY_DOCUMENT: MaterialContent = [{ type: "paragraph", content: [] }];

function isBlock(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMaterialContent(value: unknown): MaterialContent {
  if (!Array.isArray(value)) return EMPTY_DOCUMENT;
  const blocks = value.filter(isBlock);
  return blocks.length ? blocks : EMPTY_DOCUMENT;
}

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

export function MaterialEditor({
  organizationId,
  organizationSlug,
  materialId,
}: {
  organizationId: string;
  organizationSlug: string;
  materialId?: string;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const utils = api.useUtils();
  const material = api.content.getMaterial.useQuery(
    { organizationId, materialId: materialId ?? "" },
    { enabled: Boolean(materialId) },
  );
  const createMaterial = api.content.createMaterial.useMutation();
  const updateMaterial = api.content.updateMaterial.useMutation();
  const deleteMaterial = api.content.deleteMaterial.useMutation();

  if (materialId && material.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Loading material
      </div>
    );
  }

  if (materialId && (material.error || !material.data)) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {material.error?.message ?? "Material could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => material.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <MaterialEditorForm
      key={material.data?.id ?? "new-material"}
      initialContent={getMaterialContent(material.data?.content)}
      initialDescription={material.data?.description ?? ""}
      initialRequirementPolicy={material.data?.requirementPolicy ?? "ALL"}
      initialTitle={material.data?.title ?? ""}
      isDeleting={deleteMaterial.isPending}
      isSaving={createMaterial.isPending || updateMaterial.isPending}
      materialId={materialId}
      organizationSlug={organizationSlug}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onDelete={async () => {
        if (!materialId) return;
        try {
          await deleteMaterial.mutateAsync({ organizationId, materialId });
          await utils.content.listMaterials.invalidate({ organizationId });
          toast.success("Material deleted.");
          router.replace(`/workspace/${organizationSlug}/library/materials`);
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onSave={async ({ title, description, content, requirementPolicy }) => {
        try {
          if (materialId) {
            await updateMaterial.mutateAsync({
              organizationId,
              materialId,
              title,
              description,
              content,
              editorSchemaVersion: 1,
              requirementPolicy,
            });
            await Promise.all([
              utils.content.getMaterial.invalidate({
                organizationId,
                materialId,
              }),
              utils.content.listMaterials.invalidate({ organizationId }),
            ]);
            toast.success("Material saved.");
            return;
          }

          const created = await createMaterial.mutateAsync({
            organizationId,
            title,
            description,
            content,
            editorSchemaVersion: 1,
            requirementPolicy,
          });
          await utils.content.listMaterials.invalidate({ organizationId });
          toast.success("Material created.");
          router.replace(
            `/workspace/${organizationSlug}/library/materials/${created.id}`,
          );
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
    />
  );
}

function MaterialEditorForm({
  initialContent,
  initialDescription,
  initialRequirementPolicy,
  initialTitle,
  isDeleting,
  isSaving,
  materialId,
  organizationSlug,
  theme,
  onDelete,
  onSave,
}: {
  initialContent: MaterialContent;
  initialDescription: string;
  initialRequirementPolicy: "ALL" | "ANY";
  initialTitle: string;
  isDeleting: boolean;
  isSaving: boolean;
  materialId?: string;
  organizationSlug: string;
  theme: "light" | "dark";
  onDelete: () => Promise<void>;
  onSave: (value: {
    title: string;
    description: string | null;
    content: MaterialContent;
    requirementPolicy: "ALL" | "ANY";
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);
  const [requirementPolicy, setRequirementPolicy] = useState(
    initialRequirementPolicy,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error("Material title is required.");
      return;
    }
    await onSave({
      title: normalizedTitle,
      description: description.trim() || null,
      content,
      requirementPolicy,
    });
  }

  return (
    <form
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to materials"
            href={`/workspace/${organizationSlug}/library/materials`}
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <FileTextIcon className="size-3.5" />
              {materialId ? "Edit material" : "New material"}
            </div>
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
              {title.trim() || "Untitled material"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {materialId && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="destructive" size="icon" />
                }
              >
                <Trash2Icon />
                <span className="sr-only">Delete material</span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this material?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. Deletion can fail while the material
                    is still used by a course.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={onDelete}
                    variant="destructive"
                  >
                    {isDeleting && (
                      <LoaderCircleIcon className="animate-spin" />
                    )}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button disabled={isSaving || isDeleting} type="submit">
            {isSaving ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            {materialId ? "Save changes" : "Create material"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <section className="bg-card min-w-0 overflow-hidden rounded-xl border shadow-xs">
          <div className="border-b px-5 py-4">
            <h2 className="font-heading font-semibold">Lesson content</h2>
            <p className="text-muted-foreground text-sm">
              Type{" "}
              <kbd className="bg-muted rounded border px-1 py-0.5 text-[0.7rem]">
                /
              </kbd>{" "}
              to add headings, lists, media, and other blocks.
            </p>
          </div>
          <div className="min-h-[32rem] py-5">
            <DynamicBlockNoteEditor
              initialContent={initialContent}
              onChange={setContent}
              theme={theme}
            />
          </div>
        </section>

        <aside className="bg-card grid gap-5 rounded-xl border p-5 shadow-xs lg:sticky lg:top-6">
          <div className="grid gap-2">
            <Label htmlFor="material-title">Title</Label>
            <Input
              autoFocus={!materialId}
              id="material-title"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Introducing yourself"
              value={title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="material-description">Description</Label>
            <Textarea
              id="material-description"
              maxLength={10000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What will learners work through?"
              rows={6}
              value={description}
            />
            <p className="text-muted-foreground text-xs">
              Shown to authors when choosing content for a course.
            </p>
          </div>
          <div className="grid gap-2 border-t pt-5">
            <Label htmlFor="requirement-policy">Completion policy</Label>
            <Select
              value={requirementPolicy}
              onValueChange={(value) => {
                if (value === "ALL" || value === "ANY") {
                  setRequirementPolicy(value);
                }
              }}
            >
              <SelectTrigger className="w-full" id="requirement-policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Meet every requirement</SelectItem>
                <SelectItem value="ANY">Meet any requirement</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Applies when assessments or vocabulary requirements are attached.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
