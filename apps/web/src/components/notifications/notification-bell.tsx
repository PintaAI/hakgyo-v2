"use client";

import { useState } from "react";
import { BellIcon, CheckCheckIcon, RefreshCwIcon } from "lucide-react";

import Link from "~/components/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

function timeAgo(value: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  return `${Math.floor(hours / 24)}h lalu`;
}

/**
 * Inbox bell with unread badge. Renders nothing when logged out so it is
 * safe to mount in shared shells (AppShell is also used by public pages).
 *
 * The badge doesn't poll: it loads with the page, when the tab regains focus
 * and when the dropdown opens, and the dropdown has a refresh button. Urgent
 * notifications arrive as web push.
 */
export function NotificationBell() {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  // Shares the session store the user menu already loads, so this adds no request.
  const { data: session } = authClient.useSession();
  const countQuery = api.notification.unreadCount.useQuery(undefined, {
    enabled: !!session,
    retry: false,
    refetchOnWindowFocus: true,
  });
  // The preview list is only needed while the dropdown is open.
  const inboxQuery = api.notification.inboxList.useQuery(
    { limit: 5 },
    { retry: false, refetchOnWindowFocus: true, enabled: open },
  );
  const markAllRead = api.notification.markAllRead.useMutation({
    onSettled: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.inboxList.invalidate();
    },
  });

  if (!session || countQuery.error) return null;
  const unread = countQuery.data ?? 0;
  const items = inboxQuery.data?.items ?? [];
  const refreshing = countQuery.isFetching || inboxQuery.isFetching;
  const refresh = () =>
    Promise.all([
      utils.notification.unreadCount.invalidate(),
      utils.notification.inboxList.invalidate(),
    ]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void utils.notification.unreadCount.invalidate();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unread > 0 ? `${unread} notifikasi belum dibaca` : "Notifikasi"
            }
          />
        }
      >
        <BellIcon className="size-5" />
        {unread > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 justify-center px-1 text-[0.65rem]"
          >
            {unread > 99 ? "99+" : unread}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifikasi</span>
          <div className="flex items-center gap-3">
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-50"
              >
                <CheckCheckIcon className="size-3.5" />
                Tandai dibaca
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Muat ulang notifikasi"
              className="text-muted-foreground hover:text-foreground -m-1.5 rounded-sm p-1.5 disabled:opacity-50"
            >
              <RefreshCwIcon
                className={cn("size-3.5", refreshing && "animate-spin")}
              />
            </button>
          </div>
        </div>
        <DropdownMenuSeparator />
        {inboxQuery.isPending ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Memuat notifikasi...
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Belum ada notifikasi.
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} className="p-0">
              <Link
                href={item.path ?? "/notifications"}
                className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  {item.readAt ? null : (
                    <span
                      className="bg-primary inline-block size-2 shrink-0 rounded-full"
                      aria-label="Belum dibaca"
                    />
                  )}
                  <span className="truncate font-medium">{item.title}</span>
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {item.body}
                </span>
                <span className="text-muted-foreground text-[0.7rem]">
                  {timeAgo(item.createdAt)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-0">
          <Link
            href="/notifications"
            className="text-primary w-full rounded-sm px-2 py-2 text-center text-sm font-medium"
          >
            Lihat semua
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
