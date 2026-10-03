"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  FileTextIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input, inputSurface } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";

export type ResourcePickerKind = "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";

export type ResourcePickerOption = {
  /** Value reported by `onValueChange` (a resource or course item id). */
  id: string;
  title: string;
  description?: string | null;
  /** Questions for a tugas, entries for a set kosakata. */
  count?: number;
  timeLimitMinutes?: number | null;
  updatedAt?: Date | string | null;
  /** Optional grouping shown as a filter, for example the curriculum module. */
  group?: string;
};

type SortKey = "DEFAULT" | "TITLE_ASC" | "TITLE_DESC" | "COUNT" | "UPDATED";
type CountFilter = "ALL" | "READY" | "EMPTY";

const ALL_GROUPS = "__all__";

const resourceKinds = {
  MATERIAL: { noun: "materi", icon: FileTextIcon, count: null },
  VOCABULARY_SET: {
    noun: "set kosakata",
    icon: BookOpenIcon,
    count: {
      unit: "kata",
      empty: "Belum ada kata",
      ready: "Sudah ada kata",
      sort: "Kata terbanyak",
    },
  },
  ASSESSMENT: {
    noun: "tugas",
    icon: ClipboardCheckIcon,
    count: {
      unit: "soal",
      empty: "Belum ada soal",
      ready: "Sudah ada soal",
      sort: "Soal terbanyak",
    },
  },
} satisfies Record<
  ResourcePickerKind,
  {
    noun: string;
    icon: LucideIcon;
    count: { unit: string; empty: string; ready: string; sort: string } | null;
  }
>;

const collator = new Intl.Collator("id-ID", {
  sensitivity: "base",
  numeric: true,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function timestamp(value: ResourcePickerOption["updatedAt"]) {
  return value ? new Date(value).getTime() : 0;
}

/**
 * Select-style trigger that opens a searchable, sortable list of materi, set
 * kosakata or tugas in a sheet (bottom sheet on phones). Use it wherever a
 * plain dropdown would grow too long as the library grows.
 */
export function ResourcePicker({
  kind,
  id,
  options,
  value,
  onValueChange,
  placeholder = `Pilih ${resourceKinds[kind].noun}`,
  emptyLabel = `Belum ada ${resourceKinds[kind].noun} tersedia`,
  title = `Pilih ${resourceKinds[kind].noun}`,
  description = `Cari dan urutkan ${resourceKinds[kind].noun} untuk menemukan yang Anda perlukan.`,
  defaultSortLabel = "Urutan bawaan",
  groupLabel = "Bab",
  disabled,
  loading,
  className,
}: {
  kind: ResourcePickerKind;
  id?: string;
  options: ResourcePickerOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  title?: string;
  description?: string;
  /** Label for the order `options` arrive in (for example "Urutan kurikulum"). */
  defaultSortLabel?: string;
  groupLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const selected = options.find((option) => option.id === value);
  const isEmpty = !loading && options.length === 0;

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={Boolean(disabled) || Boolean(loading) || isEmpty}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          inputSurface,
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border py-2 pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {selected ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{selected.title}</span>
            {selected.group ? (
              <span className="text-muted-foreground truncate text-xs">
                {selected.group}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground min-w-0 flex-1 truncate">
            {loading
              ? `Memuat ${resourceKinds[kind].noun}…`
              : isEmpty
                ? emptyLabel
                : placeholder}
          </span>
        )}
        <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="gap-0 data-[side=bottom]:max-h-[85dvh] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          {/* Mount the list only while open so search and filters reset on each visit. */}
          {open ? (
            <ResourcePickerPanel
              kind={kind}
              options={options}
              value={value}
              title={title}
              description={description}
              defaultSortLabel={defaultSortLabel}
              groupLabel={groupLabel}
              onSelect={(nextValue) => {
                onValueChange(nextValue);
                setOpen(false);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ResourcePickerPanel({
  kind,
  options,
  value,
  title,
  description,
  defaultSortLabel,
  groupLabel,
  onSelect,
}: {
  kind: ResourcePickerKind;
  options: ResourcePickerOption[];
  value: string | null;
  title: string;
  description: string;
  defaultSortLabel: string;
  groupLabel: string;
  onSelect: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("DEFAULT");
  const [group, setGroup] = useState(ALL_GROUPS);
  const [countFilter, setCountFilter] = useState<CountFilter>("ALL");
  const { noun, icon: Icon, count: countLabels } = resourceKinds[kind];
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());

  const groups = useMemo(
    () => [
      ...new Set(options.flatMap((option) => option.group ?? [])).values(),
    ],
    [options],
  );
  const hasCounts =
    countLabels !== null &&
    options.some((option) => option.count !== undefined);
  // Only offer the count filter when both ready and empty resources exist.
  const showCountFilter =
    hasCounts &&
    options.some((option) => option.count === 0) &&
    options.some((option) => (option.count ?? 0) > 0);
  const countFilterLabels: Record<CountFilter, string> = {
    ALL: `Semua ${noun}`,
    READY: countLabels?.ready ?? "",
    EMPTY: countLabels?.empty ?? "",
  };
  const hasUpdatedAt = options.some((option) => option.updatedAt);

  const sortLabels: Partial<Record<SortKey, string>> = {
    DEFAULT: defaultSortLabel,
    TITLE_ASC: "Judul A–Z",
    TITLE_DESC: "Judul Z–A",
    ...(hasCounts && countLabels ? { COUNT: countLabels.sort } : {}),
    ...(hasUpdatedAt ? { UPDATED: "Terakhir diperbarui" } : {}),
  };

  const visibleOptions = useMemo(() => {
    const filtered = options.filter((option) => {
      if (group !== ALL_GROUPS && option.group !== group) return false;
      if (countFilter === "READY" && !option.count) return false;
      if (countFilter === "EMPTY" && option.count !== 0) {
        return false;
      }
      if (!deferredSearch) return true;
      return [option.title, option.description, option.group]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(deferredSearch);
    });
    if (sort === "DEFAULT") return filtered;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "TITLE_ASC":
          return collator.compare(a.title, b.title);
        case "TITLE_DESC":
          return collator.compare(b.title, a.title);
        case "COUNT":
          return (
            (b.count ?? 0) - (a.count ?? 0) ||
            collator.compare(a.title, b.title)
          );
        case "UPDATED":
          return timestamp(b.updatedAt) - timestamp(a.updatedAt);
      }
    });
  }, [options, group, countFilter, deferredSearch, sort]);

  const filtersActive =
    Boolean(deferredSearch) || group !== ALL_GROUPS || countFilter !== "ALL";

  function resetFilters() {
    setSearch("");
    setGroup(ALL_GROUPS);
    setCountFilter("ALL");
  }

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>
      <div className="space-y-2 border-b p-4">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label={`Cari ${noun}`}
            className="h-9 pl-8"
            placeholder="Cari judul atau deskripsi"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.length > 1 ? (
            <Select
              value={group}
              onValueChange={(next) => {
                if (next) setGroup(next);
              }}
            >
              <SelectTrigger
                aria-label={`Filter ${groupLabel.toLowerCase()}`}
                className="max-w-full min-w-0 flex-1"
              >
                <span className="flex min-w-0 flex-1 truncate text-left">
                  {group === ALL_GROUPS
                    ? `Semua ${groupLabel.toLowerCase()}`
                    : group}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_GROUPS}>
                  Semua {groupLabel.toLowerCase()}
                </SelectItem>
                {groups.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {showCountFilter && countLabels ? (
            <Select
              value={countFilter}
              onValueChange={(next) => {
                if (next) setCountFilter(next);
              }}
            >
              <SelectTrigger
                aria-label={`Filter jumlah ${countLabels.unit}`}
                className="flex-1"
              >
                <span className="flex flex-1 text-left">
                  {countFilterLabels[countFilter]}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(countFilterLabels) as CountFilter[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {countFilterLabels[key]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          ) : null}
          <Select
            value={sort}
            onValueChange={(next) => {
              if (next) setSort(next);
            }}
          >
            <SelectTrigger aria-label={`Urutkan ${noun}`} className="flex-1">
              <span className="flex flex-1 text-left">{sortLabels[sort]}</span>
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {sortLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-muted-foreground flex min-h-10 items-center justify-between gap-3 px-4 text-xs">
        <span>
          {visibleOptions.length} dari {options.length} {noun}
        </span>
        {filtersActive ? (
          <Button size="xs" variant="ghost" onClick={resetFilters}>
            Hapus filter
          </Button>
        ) : null}
      </div>
      <div
        role="listbox"
        aria-label={title}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-4"
      >
        {visibleOptions.length ? (
          visibleOptions.map((option) => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(option.id)}
                className={cn(
                  "hover:bg-muted focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left outline-none focus-visible:ring-3",
                  isSelected && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                    isSelected && "bg-primary text-primary-foreground",
                  )}
                >
                  {isSelected ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {option.title}
                  </span>
                  {option.description ? (
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {option.description}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {option.group ? (
                      <span className="truncate">{option.group}</span>
                    ) : null}
                    {option.timeLimitMinutes ? (
                      <span className="flex items-center gap-1">
                        <Clock3Icon className="size-3" />
                        {option.timeLimitMinutes} menit
                      </span>
                    ) : null}
                    {option.updatedAt ? (
                      <span>
                        Diperbarui{" "}
                        {dateFormatter.format(new Date(option.updatedAt))}
                      </span>
                    ) : null}
                  </span>
                </span>
                {countLabels && option.count !== undefined ? (
                  option.count === 0 ? (
                    <Badge variant="destructive" className="shrink-0">
                      {countLabels.empty}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      {option.count} {countLabels.unit}
                    </Badge>
                  )
                ) : null}
              </button>
            );
          })
        ) : (
          <p className="text-muted-foreground px-2 py-10 text-center text-sm">
            Tidak ada {noun} yang cocok.
          </p>
        )}
      </div>
    </>
  );
}
