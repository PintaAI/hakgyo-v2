"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

import type {
  MaterialLinkTarget,
  ResolvedMaterialLink,
} from "@hakgyo/shared/material-links";

import Link from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTitle } from "~/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";

/** The material links of a learner document and the item it belongs to. */
export type LearnerMaterialLinks = {
  links: ResolvedMaterialLink[];
  /** Course item showing the document, so links to it scroll in place. */
  courseItemId: string;
};

export type OpenMaterialLink = {
  element: HTMLElement;
  target: MaterialLinkTarget;
  text: string;
};

const PHONE_QUERY = "(max-width: 639px)";

function subscribePhone(callback: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useIsPhone() {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

/**
 * Preview of a tapped material link: the linked section (or material) with
 * its excerpt and a "Baca lengkap" link. A popover next to the link from `sm`
 * up and a bottom sheet on phones.
 */
export function MaterialLinkPreview({
  open,
  materialLinks,
  onClose,
  onScrollToBlock,
}: {
  open: OpenMaterialLink | null;
  materialLinks: LearnerMaterialLinks;
  onClose: () => void;
  /** Scrolls to a block of the current document. */
  onScrollToBlock: (blockId: string) => void;
}) {
  const isPhone = useIsPhone();
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const body = open ? (
    <MaterialLinkPreviewBody
      open={open}
      materialLinks={materialLinks}
      isPhone={isPhone}
      onClose={onClose}
      onScrollToBlock={onScrollToBlock}
    />
  ) : null;

  if (isPhone) {
    return (
      <Sheet open={open !== null} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 rounded-t-2xl"
        >
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Popover open={open !== null} onOpenChange={onOpenChange}>
      <PopoverContent
        anchor={open?.element}
        align="start"
        sideOffset={6}
        className="w-80 gap-0 p-0"
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}

function MaterialLinkPreviewBody({
  open,
  materialLinks,
  isPhone,
  onClose,
  onScrollToBlock,
}: {
  open: OpenMaterialLink;
  materialLinks: LearnerMaterialLinks;
  isPhone: boolean;
  onClose: () => void;
  onScrollToBlock: (blockId: string) => void;
}) {
  const { target } = open;
  const link = materialLinks.links.find(
    (candidate) => candidate.materialId === target.materialId,
  );

  if (!link) {
    return (
      <PreviewLayout
        isPhone={isPhone}
        eyebrow="Materi terkait"
        title={open.text || "Materi"}
      >
        <p className="text-muted-foreground text-sm">
          Materi ini belum ada di kelasmu.
        </p>
      </PreviewLayout>
    );
  }

  const section = target.anchor ? link.sections[target.anchor] : undefined;
  const excerpt = section ? section.excerpt : link.description;
  const sameItem = link.courseItemId === materialLinks.courseItemId;
  const href = `/learn/${link.courseId}/items/${link.courseItemId}${
    section && target.anchor ? `#${encodeURIComponent(target.anchor)}` : ""
  }`;

  return (
    <PreviewLayout
      isPhone={isPhone}
      eyebrow={section ? link.title : "Materi terkait"}
      title={section?.title ?? link.title}
      action={
        <Link
          href={href}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
          onClick={(event) => {
            onClose();
            // Already on this item: scroll instead of reloading the page.
            if (sameItem) {
              event.preventDefault();
              if (section && target.anchor) {
                onScrollToBlock(target.anchor);
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }
          }}
        >
          Baca lengkap <ArrowRightIcon />
        </Link>
      }
    >
      {excerpt ? (
        <p className="text-muted-foreground line-clamp-6 text-sm leading-relaxed">
          {excerpt}
        </p>
      ) : null}
    </PreviewLayout>
  );
}

function PreviewLayout({
  isPhone,
  eyebrow,
  title,
  action,
  children,
}: {
  isPhone: boolean;
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const eyebrowNode = (
    <span className="text-primary flex min-w-0 items-center gap-1.5 text-xs font-medium">
      <BookOpenIcon className="size-3.5 shrink-0" />
      <span className="truncate">{eyebrow}</span>
    </span>
  );
  return (
    <>
      {isPhone ? (
        <SheetHeader className="gap-1 pr-12">
          {eyebrowNode}
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Cuplikan materi terkait
          </SheetDescription>
        </SheetHeader>
      ) : (
        <div className="flex flex-col gap-1 p-4 pb-3">
          {eyebrowNode}
          <PopoverTitle className="font-heading text-base font-semibold">
            {title}
          </PopoverTitle>
        </div>
      )}
      <div className="flex flex-col gap-4 px-4 pb-4">
        {children}
        {action}
      </div>
    </>
  );
}
