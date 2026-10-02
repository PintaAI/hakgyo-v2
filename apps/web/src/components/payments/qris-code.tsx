import { QrCode } from "~/components/qr-code";
import { cn } from "~/lib/utils";

/** A QRIS code on a white tile, so payment apps can scan it in dark mode too. */
export function QrisCode({
  payload,
  label = "Kode QRIS",
  className,
}: {
  payload: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3 text-black shadow-sm",
        className,
      )}
    >
      <QrCode value={payload} label={label} className="size-full" />
    </div>
  );
}
