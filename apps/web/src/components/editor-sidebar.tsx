"use client";

import { Fragment, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

export const EDITOR_SIDEBAR_OUTLET_ID = "workspace-editor-sidebar-outlet";
export const EDITOR_SIDEBAR_TRIGGER_OUTLET_ID =
  "workspace-editor-sidebar-trigger-outlet";

function subscribeToOutlet() {
  return () => undefined;
}

function useOutlet(id: string) {
  return useSyncExternalStore(
    subscribeToOutlet,
    () => document.getElementById(id),
    () => null,
  );
}

export function EditorSidebar({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}) {
  const outlet = useOutlet(EDITOR_SIDEBAR_OUTLET_ID);
  const triggerOutlet = useOutlet(EDITOR_SIDEBAR_TRIGGER_OUTLET_ID);

  if (!outlet) return null;

  return (
    <Fragment>
      {createPortal(
        <Sidebar
          side="right"
          variant="inset"
          collapsible="offcanvas"
          className={cn(className)}
        >
          <SidebarHeader className="min-h-16 justify-center px-4">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="text-sidebar-foreground/60 truncate text-xs">
                {description}
              </p>
            ) : null}
          </SidebarHeader>
          <SidebarContent>{children}</SidebarContent>
          <SidebarRail />
        </Sidebar>,
        outlet,
      )}
      {triggerOutlet
        ? createPortal(
            <SidebarTrigger side="right" className="shrink-0" />,
            triggerOutlet,
          )
        : null}
    </Fragment>
  );
}
