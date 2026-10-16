import { LoaderCircleIcon } from "lucide-react";

import { surfaceCard } from "~/components/brand/flow-shell";
import { cn } from "~/lib/utils";

/** A card from `sm` up; on phones the form sits directly on the page. */
export const authSurface = cn(
  surfaceCard,
  "max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none sm:p-8",
);

export const authFieldClass =
  "focus-visible:ring-ring/15 h-11 rounded-xl px-4 text-base transition-colors sm:h-12 md:text-sm";

export function AuthFormError({ message }: { message: string }) {
  return (
    <p
      className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm leading-5"
      role="alert"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

export function AuthSubmitLabel({
  submitting,
  children,
}: {
  submitting: boolean;
  children: string;
}) {
  return submitting ? (
    <>
      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />{" "}
      Mohon tunggu...
    </>
  ) : (
    children
  );
}
