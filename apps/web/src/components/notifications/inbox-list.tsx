"use client";

import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

/** Full inbox with cursor pagination. Reading here marks read everywhere. */
export function InboxList() {
  const utils = api.useUtils();
  const inboxQuery = api.notification.inboxList.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: true,
    },
  );
  const markRead = api.notification.markRead.useMutation({
    onSettled: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.inboxList.invalidate();
    },
  });

  const pages = inboxQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kotak masuk</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {inboxQuery.isPending ? (
          <p className="text-muted-foreground text-sm">Memuat notifikasi…</p>
        ) : null}
        {inboxQuery.error ? (
          <p className="text-destructive text-sm">
            Gagal memuat notifikasi.
          </p>
        ) : null}
        {inboxQuery.data && items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada notifikasi.
          </p>
        ) : null}
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.path ?? "/notifications"}
            onClick={() => {
              if (!item.readAt) markRead.mutate({ id: item.id });
            }}
            className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50 ${
              item.readAt ? "opacity-70" : ""
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              {item.readAt ? null : (
                <span
                  className="bg-primary inline-block size-2 shrink-0 rounded-full"
                  aria-label="Belum dibaca"
                />
              )}
              <span className="font-medium">{item.title}</span>
              <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                {new Date(item.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </span>
            <span className="text-muted-foreground text-sm">{item.body}</span>
          </Link>
        ))}
        {inboxQuery.hasNextPage ? (
          <Button
            variant="outline"
            onClick={() => void inboxQuery.fetchNextPage()}
            disabled={inboxQuery.isFetchingNextPage}
          >
            {inboxQuery.isFetchingNextPage ? "Memuat…" : "Muat lebih banyak"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
