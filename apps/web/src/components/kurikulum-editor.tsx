"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatPdfPageRange, type PdfPageRange } from "@hakgyo/shared";
import Link from "next/link";
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
  FileStackIcon,
  FileTextIcon,
  GripVerticalIcon,
  Layers3Icon,
  LightbulbIcon,
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
import {
  ReadinessBadge,
  ReadinessSummaryChip,
  courseItemAnchorId,
  coursePublicationLabels,
  summarizeReadiness,
  type CourseItemHref,
  type ItemReadiness,
} from "~/components/course-readiness";
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
import {
  AssessmentPicker,
  type AssessmentPickerOption,
} from "~/components/assessment-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import {
  defaultCourseItemPublished,
  knownNotReadyReason,
} from "~/lib/course-item-publication";
import { api, type RouterOutputs } from "~/trpc/react";

type Course = RouterOutputs["course"]["get"];
type CourseModule = Course["modules"][number];
type CourseItem = CourseModule["items"][number];
/** Library resources only need an id and title to be picked and labelled. */
type ResourceOption = { id: string; title: string };
type Material = ResourceOption;
/** Picker metadata; `questionCount` also lets the add-item dialog tell an empty assessment apart. */
type Assessment = ResourceOption &
  Omit<AssessmentPickerOption, "id" | "title" | "group">;
type VocabularySet = ResourceOption;
type PdfPageRangesByMaterial = Partial<Record<string, PdfPageRange[]>>;
type ItemType = CourseItem["type"];

const itemMeta = {
  MATERIAL: { label: "Materi", icon: FileTextIcon },
  ASSESSMENT: { label: "Tugas", icon: ListChecksIcon },
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

const kurikulumCollisionDetection: CollisionDetection = (args) => {
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

/** "PDF · Hal. 24–31" for lessons built from PDF book pages. */
function pdfLessonLabel(
  item: CourseItem,
  pdfPageRanges: PdfPageRangesByMaterial,
  pageOffsets: ReadonlyMap<string, number>,
) {
  if (item.type !== "MATERIAL" || !item.materialId) return null;
  const ranges = pdfPageRanges[item.materialId] ?? [];
  const first = ranges[0];
  if (!first) return null;
  const label = formatPdfPageRange(
    first.startPage,
    first.endPage,
    pageOffsets.get(first.bookId) ?? 0,
  );
  return `PDF · ${label}${ranges.length > 1 ? ` +${ranges.length - 1}` : ""}`;
}

function resourceHref(
  item: CourseItem,
  organizationSlug: string,
  courseId: string,
  moduleId: string,
) {
  if (item.type === "MATERIAL" && item.materialId) {
    return `/workspace/${organizationSlug}/library/materials/${item.materialId}`;
  }
  if (item.type === "ASSESSMENT" && item.assessmentId) {
    return `/workspace/${organizationSlug}/courses/${courseId}/kurikulum/${moduleId}/assessments/${item.assessmentId}`;
  }
  if (item.type === "VOCABULARY_SET" && item.vocabularySetId) {
    return `/workspace/${organizationSlug}/courses/${courseId}/kurikulum/${moduleId}/vocabulary/${item.vocabularySetId}`;
  }
  return null;
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

export function KurikulumEditor({
  initialCourse,
  organizationSlug,
  materials,
  assessments,
  vocabularySets,
}: {
  initialCourse: Course;
  organizationSlug: string;
  materials: Material[];
  assessments: Assessment[];
  vocabularySets: VocabularySet[];
}) {
  const utils = api.useUtils();
  // Seeded from the server render; mutations refresh this query instead of
  // re-rendering the whole route.
  const { data: course = initialCourse } = api.course.get.useQuery(
    { courseId: initialCourse.id },
    { initialData: initialCourse },
  );
  // `initialData` is ignored once the query is cached, so a fresh server render (e.g. returning
  // from creating an item) must overwrite the cached course explicitly.
  useEffect(() => {
    utils.course.get.setData({ courseId: initialCourse.id }, initialCourse);
  }, [initialCourse, utils]);
  const pdfPageRangesQuery = api.content.listCoursePdfPageRanges.useQuery({
    courseId: initialCourse.id,
  });
  const pdfPageRanges: PdfPageRangesByMaterial = pdfPageRangesQuery.data ?? {};
  const readinessQuery = api.content.getCurriculumReadiness.useQuery({
    courseId: initialCourse.id,
  });
  const readinessByItem = new Map(
    (readinessQuery.data?.items ?? []).map((item) => [item.courseItemId, item]),
  );
  const [hideBlocked, setHideBlocked] = useState<{
    kind: "hide" | "delete";
    name: string;
    dependents: string[];
  } | null>(null);
  const [moduleDialog, setModuleDialog] = useState<{
    open: boolean;
    module?: CourseModule;
  }>({ open: false });
  const [itemModule, setItemModule] = useState<CourseModule | null>(null);
  const [progressionMode, setProgressionMode] = useState(
    course.progressionMode,
  );
  const [progressionSource, setProgressionSource] = useState(
    course.progressionMode,
  );
  if (course.progressionMode !== progressionSource) {
    setProgressionSource(course.progressionMode);
    setProgressionMode(course.progressionMode);
  }
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
  const pdfBooks = api.pdfBook.list.useQuery({
    organizationId: course.organizationId,
  });
  const pageOffsets = new Map(
    (pdfBooks.data ?? []).map((book) => [book.id, book.pageOffset]),
  );
  const importPdfHref = `/workspace/${organizationSlug}/courses/${course.id}/kurikulum/impor-pdf`;
  if (course.modules !== modulesSource) {
    setModulesSource(course.modules);
    setModules(course.modules);
  }
  const itemCount = modules.reduce(
    (total, module) => total + module.items.length,
    0,
  );
  const workspaceQueryInput = {
    courseId: course.id,
    organizationSlug,
  };

  async function refreshCourse({
    publishesAssessments = false,
  }: { publishesAssessments?: boolean } = {}) {
    await Promise.all([
      utils.course.get.invalidate({ courseId: course.id }),
      utils.course.getWorkspaceOverview.invalidate(workspaceQueryInput),
      utils.content.listCoursePdfPageRanges.invalidate({
        courseId: course.id,
      }),
      utils.content.getCurriculumReadiness.invalidate({ courseId: course.id }),
      // Showing or hiding an item changes whether its assessment is live
      // (and therefore editable).
      ...(publishesAssessments
        ? [
            utils.assessment.get.invalidate(),
            utils.assessment.list.invalidate(),
          ]
        : []),
    ]);
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
        utils.course.getWorkspaceOverview.invalidate(workspaceQueryInput),
        utils.learning.getCourseOutline.invalidate({ courseId: course.id }),
      ]);
      toast.success(
        nextMode === "OPEN"
          ? "Semua bab sekarang terbuka."
          : "Bertahap diaktifkan.",
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

  /** Titles of every item, for naming dependents. */
  function itemName(courseItemId: string) {
    for (const courseModule of modules) {
      const item = courseModule.items.find(({ id }) => id === courseItemId);
      if (item) {
        return (
          resourceTitle(item, materials, assessments, vocabularySets) ??
          readinessByItem.get(courseItemId)?.title ??
          "Resource tidak tersedia"
        );
      }
    }
    return readinessByItem.get(courseItemId)?.title ?? "item";
  }

  /**
   * Visible, ready lessons that would break if `item` were hidden or removed:
   * the same checks the server runs, surfaced before the request. Another
   * visible placement of the same resource in the module keeps them working.
   */
  function blockingDependents(item: CourseItem) {
    const readiness = readinessByItem.get(item.id);
    if (!readiness?.dependents.length) return [];
    const courseModule = modules.find(({ id }) => id === readiness.moduleId);
    const resourceId = itemResourceId(item);
    const hasOtherVisiblePlacement = courseModule?.items.some(
      (candidate) =>
        candidate.id !== item.id &&
        candidate.isPublished &&
        candidate.type === item.type &&
        itemResourceId(candidate) === resourceId,
    );
    if (hasOtherVisiblePlacement) return [];
    return readiness.dependents.filter((dependentId) => {
      const dependent = readinessByItem.get(dependentId);
      return dependent?.isPublished && dependent.ready;
    });
  }

  async function togglePublished(item: CourseItem, checked: boolean) {
    if (!checked) {
      const dependents = blockingDependents(item);
      if (dependents.length) {
        setHideBlocked({
          kind: "hide",
          name: itemName(item.id),
          dependents: dependents.map(itemName),
        });
        return;
      }
    }
    try {
      await updateItem.mutateAsync({ itemId: item.id, isPublished: checked });
      await refreshCourse({ publishesAssessments: true });
      toast.success(
        checked
          ? course.status === "PUBLISHED"
            ? "Item ditampilkan untuk learner."
            : "Item akan tampil setelah course dipublikasikan."
          : "Item disembunyikan dari learner.",
      );
    } catch (error) {
      // Readiness may have changed since it was loaded; refresh the badges.
      void utils.content.getCurriculumReadiness.invalidate({
        courseId: course.id,
      });
      toast.error(getErrorMessage(error), { duration: 8000 });
    }
  }

  function requestDeleteItem(item: CourseItem) {
    const name =
      resourceTitle(item, materials, assessments, vocabularySets) ??
      "Resource tidak tersedia";
    const dependents = item.isPublished ? blockingDependents(item) : [];
    if (dependents.length) {
      setHideBlocked({
        kind: "delete",
        name,
        dependents: dependents.map(itemName),
      });
      return;
    }
    setDeleteTarget({ kind: "item", id: item.id, name });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "module") {
        await deleteModule.mutateAsync({ moduleId: deleteTarget.id });
        toast.success("Bab dihapus.");
      } else {
        await deleteItem.mutateAsync({ itemId: deleteTarget.id });
        toast.success("Item dihapus dari kurikulum.");
      }
      setDeleteTarget(null);
      await refreshCourse({ publishesAssessments: true });
    } catch (error) {
      void utils.content.getCurriculumReadiness.invalidate({
        courseId: course.id,
      });
      toast.error(getErrorMessage(error), { duration: 8000 });
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
        <div className="flex flex-wrap items-center gap-2">
          {readinessQuery.data ? (
            <ReadinessSummaryChip summary={readinessQuery.data.summary} />
          ) : null}
          <Badge
            variant={course.status === "PUBLISHED" ? "default" : "outline"}
          >
            {coursePublicationLabels[course.status]}
          </Badge>
        </div>
      </div>

      <header className="border-foreground/10 grid gap-6 border-b pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            Pembuat kurikulum
          </p>
          <h1 className="font-heading mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
            Susun alur belajar menjadi bab, lalu buat atau hubungkan materi,
            tugas, dan kosakata tanpa perlu membuka library.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="kurikulum-progression"
              className="text-muted-foreground text-xs"
            >
              Progression
            </Label>
            <Select
              value={progressionMode}
              disabled={updateProgression.isPending}
              onValueChange={(value) => {
                if (value) void changeProgressionMode(value);
              }}
            >
              <SelectTrigger
                id="kurikulum-progression"
                aria-label="Progression"
                className="min-w-48"
              >
                <span className="flex flex-1 text-left">
                  {progressionMode === "OPEN" ? "Terbuka" : "Bertahap"}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="OPEN">Terbuka</SelectItem>
                <SelectItem value="SEQUENTIAL">Bertahap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link
            href={importPdfHref}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileStackIcon data-icon="inline-start" />
            Buat dari PDF
          </Link>
          <Button onClick={() => setModuleDialog({ open: true })}>
            <PlusIcon data-icon="inline-start" />
            Tambah bab
          </Button>
        </div>
      </header>

      <section
        aria-label="Kurikulum summary"
        className="bg-card grid grid-cols-3 divide-x rounded-lg border py-4"
      >
        <SummaryStat label="Bab" value={modules.length} />
        <SummaryStat label="Learning item" value={itemCount} />
        <SummaryStat
          label="Progression"
          value={progressionMode === "OPEN" ? "Terbuka" : "Bertahap"}
        />
      </section>

      {course.status !== "PUBLISHED" && itemCount > 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-xs leading-relaxed">
          Course belum dipublikasikan, jadi belum ada item yang terlihat oleh
          learner. Item yang ditampilkan akan tayang setelah course
          dipublikasikan dari workspace course.
        </p>
      ) : null}

      {modules.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center rounded-xl border border-dashed px-5 py-12 text-center">
            <span className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Layers3Icon className="text-muted-foreground size-5" />
            </span>
            <h2 className="font-heading mt-4 text-xl font-medium">
              Mulai dari nol
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed">
              Buat bab, lalu susun materi, kosakata, dan tugas dengan editor
              Hakgyo.
            </p>
            <Button
              className="mt-5"
              onClick={() => setModuleDialog({ open: true })}
            >
              <PlusIcon data-icon="inline-start" />
              Buat bab
            </Button>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-dashed px-5 py-12 text-center">
            <span className="bg-muted flex size-12 items-center justify-center rounded-full">
              <FileStackIcon className="text-muted-foreground size-5" />
            </span>
            <h2 className="font-heading mt-4 text-xl font-medium">
              Impor dari buku PDF
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed">
              Sudah punya buku sendiri? Unggah PDF dan petakan halamannya ke
              setiap bab dalam beberapa menit.
            </p>
            <Link href={importPdfHref} className={cn(buttonVariants(), "mt-5")}>
              <FileStackIcon data-icon="inline-start" />
              Impor PDF
            </Link>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={kurikulumCollisionDetection}
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
                  pdfPageRanges={pdfPageRanges}
                  pageOffsets={pageOffsets}
                  assessments={assessments}
                  courseId={course.id}
                  organizationSlug={organizationSlug}
                  vocabularySets={vocabularySets}
                  readinessByItem={readinessByItem}
                  onAddItem={() => setItemModule(module)}
                  onDeleteItem={requestDeleteItem}
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
        onSaved={() => refreshCourse()}
      />
      <ItemDialog
        key={itemModule?.id ?? "no-module"}
        assessments={assessments}
        courseId={course.id}
        courseStatus={course.status}
        materials={materials}
        moduleReadiness={
          itemModule
            ? (readinessQuery.data?.items ?? []).filter(
                (item) => item.moduleId === itemModule.id,
              )
            : []
        }
        module={itemModule}
        organizationSlug={organizationSlug}
        vocabularySets={vocabularySets}
        onClose={() => setItemModule(null)}
        onSaved={() => refreshCourse({ publishesAssessments: true })}
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
              Hapus {deleteTarget?.kind === "module" ? "bab" : "item"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "module"
                ? `Bab “${deleteTarget.name}” dan seluruh item di dalamnya akan dihapus. Resource aslinya tetap tersimpan.`
                : `“${deleteTarget?.name}” akan dilepas dari kurikulum. Resource aslinya tetap tersimpan.`}
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
      <AlertDialog
        open={Boolean(hideBlocked)}
        onOpenChange={(open) => !open && setHideBlocked(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CircleOffIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {hideBlocked?.kind === "delete"
                ? "Item belum bisa dihapus"
                : "Item belum bisa disembunyikan"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{hideBlocked?.name}” dipakai oleh materi yang sedang ditampilkan
              di bab ini. Sembunyikan materi berikut terlebih dahulu, atau lepas
              rujukannya dari materi tersebut:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="grid gap-1 text-sm">
            {hideBlocked?.dependents.map((dependent, index) => (
              <li key={`${dependent}:${index}`} className="flex gap-2">
                <FileTextIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{dependent}</span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Mengerti</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function itemResourceId(item: CourseItem) {
  return item.type === "MATERIAL"
    ? item.materialId
    : item.type === "ASSESSMENT"
      ? item.assessmentId
      : item.vocabularySetId;
}

const itemAnchorHref: CourseItemHref = (courseItemId) =>
  `#${courseItemAnchorId(courseItemId)}`;

function SortableModuleCard({
  module,
  moduleIndex,
  courseId,
  isReordering,
  isItemUpdatePending,
  materials,
  pdfPageRanges,
  pageOffsets,
  assessments,
  organizationSlug,
  vocabularySets,
  readinessByItem,
  onAddItem,
  onDeleteItem,
  onDeleteModule,
  onEditModule,
  onTogglePublished,
}: {
  readinessByItem: ReadonlyMap<string, ItemReadiness>;
  module: CourseModule;
  moduleIndex: number;
  courseId: string;
  isReordering: boolean;
  isItemUpdatePending: boolean;
  materials: Material[];
  pdfPageRanges: PdfPageRangesByMaterial;
  pageOffsets: ReadonlyMap<string, number>;
  assessments: Assessment[];
  organizationSlug: string;
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
  const hasPdfLesson = module.items.some((item) =>
    Boolean(pdfLessonLabel(item, pdfPageRanges, pageOffsets)),
  );
  const hasPractice = module.items.some(
    (item) => item.type === "VOCABULARY_SET" || item.type === "ASSESSMENT",
  );
  const moduleReadiness = module.items.flatMap((item) => {
    const readiness = readinessByItem.get(item.id);
    return readiness ? [readiness] : [];
  });

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
          aria-label="Seret bab untuk mengurutkan"
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
            <h2 className="font-heading text-lg font-medium">{module.title}</h2>
            <Badge variant="secondary">{module.items.length} item</Badge>
            {moduleReadiness.length ? (
              <ReadinessSummaryChip
                summary={summarizeReadiness(moduleReadiness)}
              />
            ) : null}
          </div>
          {module.description ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {module.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label="Edit bab"
            size="icon-sm"
            variant="ghost"
            onClick={onEditModule}
          >
            <PencilIcon />
          </Button>
          <Button
            aria-label="Hapus bab"
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
                href={resourceHref(item, organizationSlug, courseId, module.id)}
                title={
                  resourceTitle(item, materials, assessments, vocabularySets) ??
                  "Resource tidak tersedia"
                }
                pdfLabel={pdfLessonLabel(item, pdfPageRanges, pageOffsets)}
                readiness={readinessByItem.get(item.id)}
                onTogglePublished={onTogglePublished}
                onDeleteItem={() => onDeleteItem(item)}
              />
            ))}
          </ol>
        </SortableContext>
      ) : (
        <div className="text-muted-foreground border-t border-dashed px-5 py-7 text-center text-sm">
          Bab ini belum memiliki learning item.
        </div>
      )}
      {hasPdfLesson && !hasPractice ? (
        <div className="flex flex-wrap items-center gap-2 border-t bg-amber-500/5 px-4 py-2.5 text-xs sm:px-5">
          <LightbulbIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-muted-foreground flex-1">
            Tambahkan kosakata atau kuis agar siswa bisa berlatih setelah
            membaca halaman PDF bab ini.
          </span>
          <Button size="xs" variant="outline" onClick={onAddItem}>
            <PlusIcon data-icon="inline-start" />
            Tambah kosakata atau kuis
          </Button>
        </div>
      ) : null}
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
  href,
  title,
  pdfLabel,
  readiness,
  onTogglePublished,
  onDeleteItem,
}: {
  pdfLabel: string | null;
  readiness: ItemReadiness | undefined;
  item: CourseItem;
  moduleId: string;
  isPending: boolean;
  isReordering: boolean;
  href: string | null;
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
  const Icon = pdfLabel ? FileStackIcon : meta.icon;
  // A hidden item that is not ready cannot be shown; a visible one that is
  // not ready (legacy data) can still be hidden.
  const showBlockedReason =
    readiness && !readiness.ready && !item.isPublished
      ? "Item ini belum siap ditampilkan. Lihat “Belum siap” untuk detail dan perbaikannya."
      : null;

  return (
    <li
      id={courseItemAnchorId(item.id)}
      ref={setNodeRef}
      style={style}
      className={cn(
        "group target:bg-muted/60 flex scroll-mt-24 items-center gap-3 px-4 py-3 sm:px-5",
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
      <Link
        href={href ?? "#"}
        aria-disabled={!href}
        tabIndex={href ? undefined : -1}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md",
          href && "hover:bg-muted/60 -my-1 px-1 py-1 transition-colors",
          !href && "pointer-events-none",
        )}
      >
        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="text-muted-foreground mt-0.5 block text-[11px] tracking-wide uppercase">
            {pdfLabel ?? meta.label}
          </span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        {readiness ? (
          <ReadinessBadge
            readiness={readiness}
            itemHref={itemAnchorHref}
            className="mr-1 max-w-56"
          />
        ) : null}
        <VisibilitySwitch
          item={item}
          isPending={isPending}
          blockedReason={showBlockedReason}
          onTogglePublished={onTogglePublished}
        />
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

function VisibilitySwitch({
  item,
  isPending,
  blockedReason,
  onTogglePublished,
}: {
  item: CourseItem;
  isPending: boolean;
  blockedReason: string | null;
  onTogglePublished: (item: CourseItem, checked: boolean) => void;
}) {
  const label = item.isPublished ? "Sembunyikan item" : "Tampilkan item";
  const disabled = isPending || Boolean(blockedReason);
  const controls = (
    <>
      <div className="mr-1 hidden items-center gap-2 sm:flex">
        <Label
          htmlFor={`published-${item.id}`}
          className="text-muted-foreground text-xs font-normal"
        >
          Tampil
        </Label>
        <Switch
          id={`published-${item.id}`}
          aria-label={label}
          checked={item.isPublished}
          disabled={disabled}
          onCheckedChange={(checked) => onTogglePublished(item, checked)}
        />
      </div>
      <Button
        aria-label={label}
        disabled={disabled}
        size="icon-sm"
        variant="ghost"
        className="sm:hidden"
        onClick={() => onTogglePublished(item, !item.isPublished)}
      >
        {item.isPublished ? <CheckCircle2Icon /> : <CircleOffIcon />}
      </Button>
    </>
  );
  if (!blockedReason) return controls;
  // Disabled controls do not emit pointer events; the wrapper carries the
  // explanation.
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex items-center" tabIndex={0} />}
        aria-label={blockedReason}
      >
        {controls}
      </TooltipTrigger>
      <TooltipContent>{blockedReason}</TooltipContent>
    </Tooltip>
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
      <span className="font-heading mt-1 block truncate text-xl font-medium sm:text-2xl">
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
      toast.success(state.module ? "Bab diperbarui." : "Bab dibuat.");
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
              {state.module ? "Edit bab" : "Tambah bab"}
            </DialogTitle>
            <DialogDescription>
              Bab membagi kurikulum menjadi tahapan belajar yang terurut.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module-title">Judul bab</Label>
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
              {state.module ? "Simpan perubahan" : "Tambah bab"}
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
  courseId,
  courseStatus,
  moduleReadiness,
  organizationSlug,
  onClose,
  onSaved,
}: {
  moduleReadiness: ItemReadiness[];
  module: CourseModule | null;
  materials: Material[];
  assessments: Assessment[];
  vocabularySets: VocabularySet[];
  courseId: string;
  courseStatus: Course["status"];
  organizationSlug: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<ItemType>("MATERIAL");
  const [resourceId, setResourceId] = useState("");
  const publishByDefault = defaultCourseItemPublished(courseStatus);
  const [isPublished, setIsPublished] = useState(publishByDefault);
  const readinessById = new Map(
    moduleReadiness.map((item) => [item.courseItemId, item]),
  );
  function notReadyReasonFor(candidateId: string) {
    return knownNotReadyReason({
      type,
      questionCount:
        type === "ASSESSMENT"
          ? assessments.find((resource) => resource.id === candidateId)
              ?.questionCount
          : undefined,
      placementsInModule: (module?.items ?? [])
        .filter(
          (item) => item.type === type && itemResourceId(item) === candidateId,
        )
        .flatMap((item) => {
          const readiness = readinessById.get(item.id);
          return readiness ? [readiness] : [];
        }),
    });
  }
  const notReadyReason = resourceId ? notReadyReasonFor(resourceId) : null;

  function selectResource(nextResourceId: string) {
    setResourceId(nextResourceId);
    // Re-derive the default for the picked resource (hidden when not ready).
    const reason = notReadyReasonFor(nextResourceId);
    setIsPublished(defaultCourseItemPublished(courseStatus, reason));
  }
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
    setIsPublished(publishByDefault);
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      setType("MATERIAL");
      setResourceId("");
      setIsPublished(publishByDefault);
    } else {
      close();
    }
  }

  function changeType(nextType: ItemType) {
    setType(nextType);
    setResourceId("");
    setIsPublished(publishByDefault);
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
        isPublished: isPublished && !notReadyReason,
        relation,
      });
      close();
      await onSaved();
      toast.success("Learning item ditambahkan.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const createHref = module
    ? `/workspace/${organizationSlug}/courses/${courseId}/kurikulum/${module.id}/${
        type === "MATERIAL"
          ? "materials"
          : type === "ASSESSMENT"
            ? "assessments"
            : "vocabulary"
      }/new`
    : "#";
  const resourceLabel = itemMeta[type].label.toLowerCase();
  const createLabel =
    type === "MATERIAL"
      ? "Buat materi"
      : type === "VOCABULARY_SET"
        ? "Buat set kosakata"
        : "Buat tugas";

  return (
    <Dialog open={Boolean(module)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Tambah learning item</DialogTitle>
            <DialogDescription>
              Buka editor lengkap untuk membuat resource baru, atau pilih dari
              library untuk bab {module?.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label>Jenis resource</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["MATERIAL", "VOCABULARY_SET", "ASSESSMENT"] as const).map(
                  (itemType) => {
                    const meta = itemMeta[itemType];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={itemType}
                        type="button"
                        aria-pressed={type === itemType}
                        className={cn(
                          "hover:bg-muted flex min-w-0 flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors sm:flex-row sm:px-3 sm:text-left sm:text-sm",
                          type === itemType &&
                            "border-primary bg-primary/5 text-primary ring-primary/20 ring-2",
                        )}
                        onClick={() => changeType(itemType)}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{meta.label}</span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {module ? (
              <div className="bg-primary/5 flex items-center justify-between gap-4 rounded-xl border p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Buat {resourceLabel} baru
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Gunakan editor lengkap. Resource akan otomatis ditambahkan
                    ke bab ini dan tombol kembali membawa Anda ke kurikulum.
                  </p>
                </div>
                <Link
                  href={createHref}
                  className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
                >
                  <PlusIcon data-icon="inline-start" />
                  {createLabel}
                </Link>
              </div>
            ) : null}

            <div className="relative flex items-center py-1">
              <div className="grow border-t" />
              <span className="text-muted-foreground px-3 text-xs">
                atau pilih dari library
              </span>
              <div className="grow border-t" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-resource">{itemMeta[type].label}</Label>
              {type === "ASSESSMENT" ? (
                <AssessmentPicker
                  id="item-resource"
                  options={assessments}
                  value={resourceId || null}
                  onValueChange={selectResource}
                  defaultSortLabel="Urutan library"
                />
              ) : (
                <Select
                  value={resourceId || "NONE"}
                  disabled={resources.length === 0}
                  onValueChange={(value) => {
                    if (value && value !== "NONE") selectResource(value);
                  }}
                >
                  <SelectTrigger id="item-resource" className="h-10 w-full">
                    <span className="flex min-w-0 flex-1 truncate text-left">
                      {resources.find((resource) => resource.id === resourceId)
                        ?.title ??
                        (resources.length === 0
                          ? `Belum ada ${resourceLabel} tersedia`
                          : `Pilih ${resourceLabel}`)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        {resource.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {resources.length === 0 ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <CircleOffIcon className="size-3.5" />
                  Library masih kosong. Gunakan “{createLabel}” untuk membuat
                  yang pertama.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
              <div>
                <Label htmlFor="item-published">Langsung tampilkan</Label>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    notReadyReason
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
                  )}
                >
                  {notReadyReason
                    ? `${notReadyReason} Item ditambahkan dalam keadaan tersembunyi; tampilkan setelah lengkap.`
                    : courseStatus === "PUBLISHED"
                      ? "Item langsung terlihat oleh learner. Item yang belum siap tetap disembunyikan."
                      : "Item akan terlihat oleh learner setelah course dipublikasikan."}
                </p>
              </div>
              <Switch
                id="item-published"
                checked={isPublished && !notReadyReason}
                disabled={Boolean(notReadyReason)}
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
