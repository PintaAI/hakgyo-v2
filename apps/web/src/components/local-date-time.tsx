"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * Formats a timestamp in the browser's time zone. The server renders in UTC
 * on Vercel, so the formatted text only appears after hydration; formatting it
 * during server rendering would show another time and break hydration.
 */
export function LocalDateTime({
  value,
  format,
}: {
  value: Date | string;
  format: Intl.DateTimeFormat;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(value);
  return (
    <time dateTime={date.toISOString()}>
      {hydrated ? format.format(date) : null}
    </time>
  );
}
