"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  CircleOffIcon,
  FileTextIcon,
  GripVerticalIcon,
  Layers3Icon,
  ListChecksIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Course = RouterOutputs["course"]["get"];
type CourseModule = Course["modules"][number];
type CourseItem = CourseModule["items"][number];
type Material = RouterOutputs["content"]["listMaterials"][number];
type Assessment = RouterOutputs["assessment"]["list"][number];
type VocabularySet = RouterOutputs["content"]["listVocabularySets"][number];
type ItemType = CourseItem["type"];

const itemMeta = {
  MATERIAL: { label: "Materi", icon: FileTextIcon },
  ASSESSMENT: { label: "Penilaian", icon: ListChecksIcon },
  VOCABULARY_SET: { label: "Kosakata", icon: BookOpenIcon },
} satisfies Record<ItemType, { label: string; icon: typeof FileTextIcon }>;

function getDragData(value: unknown) {
  if (typeof value !== "object" || value === null) return {};
  const data = value as Record<string, unknown>;
  return {
    kind:
      data.kind === "module" || data.kind === "item" ? data.kind : undefined,
    moduleId: typeof data.moduleId === "string" ? data.moduleId : undefined,
  };
}

const curriculumCollisionDetection: CollisionDetection = (args) => {
  const active = getDragData(args.active.data.current);
  const droppableContainers = args.droppableContainers.filter((container) => {
    const candidate = getDragData(container.data.current);
    if (candidate.kind !== active.kind) return false;
    return active.kind !== "item" || candidate.moduleId === active.moduleId;
  });

  return closestCorners({ ...args, droppableContainers });
};

function resourceTitle(
  item: CourseItem,
  materials: Material[],
  assessments: Assessment[],
  vocabularySets: VocabularySet[],
) {
  if (item.type === "MATERIAL") {
    return materials.find((resource) => resource.id === item.materialId)?.title;
  }
  if (item.type === "ASSESSMENT") {
    return assessments.find((resource) => resource.id === item.assessmentId)
      ?.title;
  }
  return vocabularySets.find((resource) => resource.id === item.vocabularySetId)
    ?.title;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Perubahan belum berhasil disimpan. Silakan coba lagi.";
}

export function CurriculumEditor({
  course,
  organizationId,
  organizationSlug,
  materials,
  assessments,
  vocabularySets,
}: {
  course: Course;
  organizationId: string;
  organizationSlug: string;
  materials: Material[];
  assessments: Assessment[];
  vocabularySets: VocabularySet[];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [moduleDialog, setModuleDialog] = useState<{
    open: boolean;
    module?: CourseModule;
  }>({ open: false });
  const [itemModule, setItemModule] = useState<CourseModule | null>(null);
  const [progressionMode, setProgressionMode] = useState(
    course.progressionMode,
  );
  const [modules, setModules] = useState(course.modules);
  const [modulesSource, setModulesSource] = useState(course.modules);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "module"; id: string; name: string }
    | { kind: "item"; id: string; name: string }
    | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const reorderModules = api.content.reorderModules.useMutation();
  const reorderItems = api.content.reorderItems.useMutation();
  const updateProgression = api.learning.setProgressionMode.useMutation();
  const updateItem = api.content.updateItem.useMutation();
  const deleteModule = api.content.deleteModule.useMutation();
  const deleteItem = api.content.deleteItem.useMutation();
  if (course.modules !== modulesSource) {
    setModulesSource(course.modules);
    setModules(course.modules);
  }
  const itemCount = modules.reduce(
    (total, module) => total + module.items.length,
    0,
  );

  async function refreshCourse() {
    await utils.course.get.invalidate({ courseId: course.id });
    router.refresh();
  }

  async function changeProgressionMode(nextMode: Course["progressionMode"]) {
    const previousMode = progressionMode;
    setProgressionMode(nextMode);
    try {
      await updateProgression.mutateAsync({
        courseId: course.id,
        progressionMode: nextMode,
      });
      await Promise.all([
        utils.course.get.invalidate({ courseId: course.id }),
        utils.learning.getCourseOutline.invalidate({ courseId: course.id }),
      ]);
      router.refresh();
      toast.success(
        nextMode === "OPEN"
          ? "Semua module sekarang terbuka."
          : "Progression berurutan diaktifkan.",
      );
    } catch (error) {
      setProgressionMode(previousMode);
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (modules.some(({ id }) => id === active.id)) {
      let overModuleId = over.id.toString();
      if (!modules.some(({ id }) => id === overModuleId)) {
        overModuleId =
          modules.find((module) =>
            module.items.some(({ id }) => id === over.id),
          )?.id ?? "";
      }
      if (!overModuleId || overModuleId === active.id) return;
      const oldIndex = modules.findIndex(({ id }) => id === active.id);
      const newIndex = modules.findIndex(({ id }) => id === overModuleId);
      if (oldIndex === newIndex) return;
      const previousModules = modules;
      const nextModules = arrayMove(modules, oldIndex, newIndex);
      setModules(nextModules);
      try {
        await reorderModules.mutateAsync({
          courseId: course.id,
          moduleIds: nextModules.map(({ id }) => id),
        });
      } catch (error) {
        setModules(previousModules);
        toast.error(getErrorMessage(error));
        return;
      }
      await refreshCourse();
      return;
    }

    const activeModule = modules.find((candidate) =>
      candidate.items.some(({ id }) => id === active.id),
    );
    if (!activeModule) return;
    const overItemId = activeModule.items.some(({ id }) => id === over.id)
      ? over.id
      : null;
    if (!overItemId) return;
    const oldIndex = activeModule.items.findIndex(({ id }) => id === active.id);
    const newIndex = activeModule.items.findIndex(
      ({ id }) => id === overItemId,
    );
    if (oldIndex === newIndex) return;
    const previousModules = modules;
    const nextItems = arrayMove(activeModule.items, oldIndex, newIndex);
    setModules((current) =>
      current.map((module) =>
        module.id === activeModule.id
          ? { ...module, items: nextItems }
          : module,
      ),
    );
    try {
      await reorderItems.mutateAsync({
        moduleId: activeModule.id,
        itemIds: nextItems.map(({ id }) => id),
      });
    } catch (error) {
      setModules(previousModules);
      toast.error(getErrorMessage(error));
      return;
    }
    await refreshCourse();
  }

  async function togglePublished(item: CourseItem, checked: boolean) {
    try {
      await updateItem.mutateAsync({ itemId: item.id, isPublished: checked });
      await refreshCourse();
      toast.success(checked ? "Item diterbitkan." : "Item dijadikan draf.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "module") {
        await deleteModule.mutateAsync({ moduleId: deleteTarget.id });
        toast.success("Module dihapus.");
      } else {
        await deleteItem.mutateAsync({ itemId: deleteTarget.id });
        toast.success("Item dihapus dari curriculum.");
      }
      setDeleteTarget(null);
      await refreshCourse();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isReordering = reorderModules.isPending || reorderItems.isPending;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/workspace/${organizationSlug}/courses/${course.id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2",
          )}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Workspace course
        </Link>
        <Badge variant={course.status === "PUBLISHED" ? "default" : "outline"}>
          {course.status === "PUBLISHED" ? "Course terbit" : "Course draf"}
        </Badge>
      </div>

      <header className="border-foreground/10 grid gap-6 border-b pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            Pembuat curriculum
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
            Susun alur belajar menjadi module, lalu hubungkan material,
            assessment, dan vocabulary yang sudah tersedia.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="curriculum-progression"
              className="text-muted-foreground text-xs"
            >
              Progression
            </Label>
            <select
              id="curriculum-progression"
              className="border-input bg-background focus-visible:ring-ring h-9 min-w-48 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
              disabled={updateProgression.isPending}
              value={progressionMode}
              onChange={(event) =>
                changeProgressionMode(
                  event.target.value as Course["progressionMode"],
                )
              }
            >
              <option value="OPEN">Semua module terbuka</option>
              <option value="SEQUENTIAL">Berurutan</option>
            </select>
          </div>
          <Button onClick={() => setModuleDialog({ open: true })}>
            <PlusIcon data-icon="inline-start" />
            Tambah module
          </Button>
        </div>
      </header>

      <section
        aria-label="Curriculum summary"
        className="bg-card grid grid-cols-3 divide-x rounded-lg border py-4"
      >
        <SummaryStat label="Modul" value={modules.length} />
        <SummaryStat label="Learning item" value={itemCount} />
        <SummaryStat
          label="Progression"
          value={progressionMode === "OPEN" ? "Terbuka" : "Berurutan"}
        />
      </section>

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed px-5 py-16 text-center">
          <span className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
            <Layers3Icon className="text-muted-foreground size-5" />
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-hanken-grotesk)] text-xl font-medium">
            Mulai dengan module pertama
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
            Module mengelompokkan learning item dan menentukan urutan yang
            dijalani learner.
          </p>
          <Button
            className="mt-5"
            onClick={() => setModuleDialog({ open: true })}
          >
            <PlusIcon data-icon="inline-start" />
            Buat module
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={curriculumCollisionDetection}
          measuring={{
            droppable: { strategy: MeasuringStrategy.Always },
          }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={modules.map(({ id }) => id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-4">
              {modules.map((module, moduleIndex) => (
                <SortableModuleCard
                  key={module.id}
                  module={module}
                  moduleIndex={moduleIndex}
                  isItemUpdatePending={updateItem.isPending}
                  isReordering={isReordering}
                  materials={materials}
                  assessments={assessments}
                  vocabularySets={vocabularySets}
                  onAddItem={() => setItemModule(module)}
                  onDeleteItem={(item) =>
                    setDeleteTarget({
                      kind: "item",
                      id: item.id,
                      name:
                        resourceTitle(
                          item,
                          materials,
                          assessments,
                          vocabularySets,
                        ) ?? "Resource tidak tersedia",
                    })
                  }
                  onDeleteModule={() =>
                    setDeleteTarget({
                      kind: "module",
                      id: module.id,
                      name: module.title,
                    })
                  }
                  onEditModule={() => setModuleDialog({ open: true, module })}
                  onTogglePublished={togglePublished}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <ModuleDialog
        key={moduleDialog.module?.id ?? "new-module"}
        courseId={course.id}
        state={moduleDialog}
        onClose={() => setModuleDialog({ open: false })}
        onSaved={refreshCourse}
      />
      <ItemDialog
        key={itemModule?.id ?? "no-module"}
        assessments={assessments}
        materials={materials}
        module={itemModule}
        organizationId={organizationId}
        vocabularySets={vocabularySets}
        onClose={() => setItemModule(null)}
        onSaved={refreshCourse}
      />
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Hapus {deleteTarget?.kind === "module" ? "module" : "item"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "module"
                ? `Module “${deleteTarget.name}” dan seluruh item di dalamnya akan dihapus. Resource aslinya tetap tersimpan.`
                : `“${deleteTarget?.name}” akan dilepas dari curriculum. Resource aslinya tetap tersimpan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteModule.isPending || deleteItem.isPending}
              onClick={confirmDelete}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableModuleCard({
  module,
  moduleIndex,
  isReordering,
  isItemUpdatePending,
  materials,
  assessments,
  vocabularySets,
  onAddItem,
  onDeleteItem,
  onDeleteModule,
  onEditModule,
  onTogglePublished,
}: {
  module: CourseModule;
  moduleIndex: number;
  isReordering: boolean;
  isItemUpdatePending: boolean;
  materials: Material[];
  assessments: Assessment[];
  vocabularySets: VocabularySet[];
  onAddItem: () => void;
  onDeleteItem: (item: CourseItem) => void;
  onDeleteModule: () => void;
  onEditModule: () => void;
  onTogglePublished: (item: CourseItem, checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.id,
    disabled: isReordering,
    data: { kind: "module" },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card overflow-hidden rounded-xl border",
        isDragging && "z-10 shadow-lg",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <button
          type="button"
          aria-label="Seret module untuk mengurutkan"
          disabled={isReordering}
          className="text-muted-foreground hover:bg-muted hover:text-foreground mt-1 cursor-grab touch-none rounded-md p-1 disabled:cursor-not-allowed disabled:opacity-50"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums">
          {String(moduleIndex + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
              {module.title}
            </h2>
            <Badge variant="secondary">{module.items.length} item</Badge>
          </div>
          {module.description ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {module.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label="Edit module"
            size="icon-sm"
            variant="ghost"
            onClick={onEditModule}
          >
            <PencilIcon />
          </Button>
          <Button
            aria-label="Hapus module"
            size="icon-sm"
            variant="ghost"
            onClick={onDeleteModule}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {module.items.length > 0 ? (
        <SortableContext
          items={module.items.map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="divide-y border-t">
            {module.items.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                moduleId={module.id}
                isPending={isItemUpdatePending}
                isReordering={isReordering}
                title={
                  resourceTitle(item, materials, assessments, vocabularySets) ??
                  "Resource tidak tersedia"
                }
                onTogglePublished={onTogglePublished}
                onDeleteItem={() => onDeleteItem(item)}
              />
            ))}
          </ol>
        </SortableContext>
      ) : (
        <div className="text-muted-foreground border-t border-dashed px-5 py-7 text-center text-sm">
          Module ini belum memiliki learning item.
        </div>
      )}
      <div className="bg-muted/30 border-t px-4 py-3 sm:px-5">
        <Button size="sm" variant="outline" onClick={onAddItem}>
          <PlusIcon data-icon="inline-start" />
          Tambah learning item
        </Button>
      </div>
    </li>
  );
}

function SortableItemRow({
  item,
  moduleId,
  isPending,
  isReordering,
  title,
  onTogglePublished,
  onDeleteItem,
}: {
  item: CourseItem;
  moduleId: string;
  isPending: boolean;
  isReordering: boolean;
  title: string;
  onTogglePublished: (item: CourseItem, checked: boolean) => void;
  onDeleteItem: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isReordering,
    data: { kind: "item", moduleId },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const meta = itemMeta[item.type];
  const Icon = meta.icon;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 sm:px-5",
        isDragging && "bg-background z-10 shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label="Seret item untuk mengurutkan"
        disabled={isReordering}
        className="text-muted-foreground/50 hover:bg-muted hover:text-foreground cursor-grab touch-none rounded-md p-1 disabled:cursor-not-allowed disabled:opacity-50"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
        <Icon className="text-muted-foreground size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground mt-0.5 block text-[11px] tracking-wide uppercase">
          {meta.label}
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <div className="mr-1 hidden items-center gap-2 sm:flex">
          <Label
            htmlFor={`published-${item.id}`}
            className="text-muted-foreground text-xs font-normal"
          >
            {item.isPublished ? "Terbit" : "Draf"}
          </Label>
          <Switch
            id={`published-${item.id}`}
            checked={item.isPublished}
            disabled={isPending}
            onCheckedChange={(checked) => onTogglePublished(item, checked)}
          />
        </div>
        <Button
          aria-label={item.isPublished ? "Jadikan item draf" : "Terbitkan item"}
          disabled={isPending}
          size="icon-sm"
          variant="ghost"
          className="sm:hidden"
          onClick={() => onTogglePublished(item, !item.isPublished)}
        >
          {item.isPublished ? <CheckCircle2Icon /> : <CircleOffIcon />}
        </Button>
        <Button
          aria-label="Hapus item"
          size="icon-sm"
          variant="ghost"
          onClick={onDeleteItem}
        >
          <Trash2Icon />
        </Button>
      </div>
    </li>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 px-4 text-center sm:px-6 sm:text-left">
      <span className="text-muted-foreground block text-[10px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="mt-1 block truncate font-[family-name:var(--font-hanken-grotesk)] text-xl font-medium sm:text-2xl">
        {value}
      </span>
    </div>
  );
}

function ModuleDialog({
  courseId,
  state,
  onClose,
  onSaved,
}: {
  courseId: string;
  state: { open: boolean; module?: CourseModule };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(state.module?.title ?? "");
  const [description, setDescription] = useState(
    state.module?.description ?? "",
  );
  const createModule = api.content.createModule.useMutation();
  const updateModule = api.content.updateModule.useMutation();
  const pending = createModule.isPending || updateModule.isPending;

  function close() {
    setTitle(state.module?.title ?? "");
    setDescription(state.module?.description ?? "");
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      setTitle(state.module?.title ?? "");
      setDescription(state.module?.description ?? "");
    } else {
      close();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (state.module) {
        await updateModule.mutateAsync({
          moduleId: state.module.id,
          title: title.trim(),
          description: description.trim() || null,
        });
      } else {
        await createModule.mutateAsync({
          courseId,
          title: title.trim(),
          description: description.trim() || null,
        });
      }
      close();
      await onSaved();
      toast.success(state.module ? "Module diperbarui." : "Module dibuat.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {state.module ? "Edit module" : "Tambah module"}
            </DialogTitle>
            <DialogDescription>
              Module membagi curriculum menjadi tahapan belajar yang terurut.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module-title">Judul module</Label>
              <Input
                id="module-title"
                autoFocus
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-description">Deskripsi</Label>
              <Textarea
                id="module-description"
                maxLength={10000}
                placeholder="Opsional"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" disabled={!title.trim() || pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {state.module ? "Simpan perubahan" : "Tambah module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  module,
  materials,
  assessments,
  vocabularySets,
  onClose,
  onSaved,
}: {
  module: CourseModule | null;
  organizationId: string;
  materials: Material[];
  assessments: Assessment[];
  vocabularySets: VocabularySet[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<ItemType>("MATERIAL");
  const [resourceId, setResourceId] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const createItem = api.content.createItem.useMutation();
  const resources =
    type === "MATERIAL"
      ? materials
      : type === "ASSESSMENT"
        ? assessments
        : vocabularySets;

  function close() {
    setType("MATERIAL");
    setResourceId("");
    setIsPublished(false);
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      setType("MATERIAL");
      setResourceId("");
      setIsPublished(false);
    } else {
      close();
    }
  }

  function changeType(nextType: ItemType) {
    setType(nextType);
    setResourceId("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!module || !resourceId) return;
    const relation =
      type === "MATERIAL"
        ? ({ type, materialId: resourceId } as const)
        : type === "ASSESSMENT"
          ? ({ type, assessmentId: resourceId } as const)
          : ({ type, vocabularySetId: resourceId } as const);
    try {
      await createItem.mutateAsync({
        moduleId: module.id,
        isPublished,
        relation,
      });
      close();
      await onSaved();
      toast.success("Learning item ditambahkan.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={Boolean(module)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Tambah learning item</DialogTitle>
            <DialogDescription>
              Hubungkan resource yang sudah tersedia ke module {module?.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="item-type">Jenis resource</Label>
              <select
                id="item-type"
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
                value={type}
                onChange={(event) => changeType(event.target.value as ItemType)}
              >
                <option value="MATERIAL">Material</option>
                <option value="ASSESSMENT">Assessment</option>
                <option value="VOCABULARY_SET">Set kosakata</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-resource">Resource</Label>
              <select
                id="item-resource"
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
                disabled={resources.length === 0}
                required
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
              >
                <option value="">
                  {resources.length === 0
                    ? "Belum ada resource tersedia"
                    : "Pilih resource"}
                </option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title}
                  </option>
                ))}
              </select>
              {resources.length === 0 ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <CircleOffIcon className="size-3.5" />
                  Buat {itemMeta[type].label.toLowerCase()} terlebih dahulu
                  melalui content API.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
              <div>
                <Label htmlFor="item-published">Langsung publish</Label>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Learner dapat melihat item setelah course diterbitkan.
                </p>
              </div>
              <Switch
                id="item-published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!resourceId || createItem.isPending}
            >
              {createItem.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CheckCircle2Icon />
              )}
              Tambahkan item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
