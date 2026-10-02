import { bankBadge } from "~/lib/payments/banks";
import { cn } from "~/lib/utils";

/** Initials on the bank's brand colour, standing in for its logo. */
export function BankBadge({
  bankCode,
  bankName,
  size = "default",
  className,
}: {
  bankCode: string;
  bankName: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const badge = bankBadge(bankCode, bankName);
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: badge.background, color: badge.foreground }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold tracking-tight",
        size === "sm"
          ? "h-5 min-w-8 px-1 text-[9px]"
          : "h-9 min-w-12 px-1.5 text-[11px]",
        className,
      )}
    >
      {badge.label}
    </span>
  );
}
