import { CheckIcon, XIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";

const comparison = [
  ["Aplikasi murid", "Rekrut developer, berbulan-bulan", "Sudah tersedia"],
  [
    "Website promosi",
    "Bayar developer, revisi terbatas",
    "Revisi desain unlimited",
  ],
  [
    "Tryout & penilaian",
    "Google Form, dinilai manual",
    "Terintegrasi, ada peringkat",
  ],
  [
    "Jadwal & link kelas",
    "Dibuat dan dikirim manual",
    "Link Zoom atau Meet otomatis",
  ],
  ["Pengingat murid", "Broadcast satu per satu", "Notifikasi otomatis"],
  ["Pemeliharaan", "Tanggungan Anda", "Kami yang urus"],
] as const;

const comparisonCell = "px-3 py-2.5 align-top sm:px-6 sm:py-3.5 lg:py-3";

/** The cost of building it yourself against Hakgyo. */
export function ComparisonSlide() {
  return (
    <Slide id="perbandingan">
      <SlideHeading
        id="perbandingan"
        title="Lebih hemat daripada"
        muted="membangun sendiri."
        className="max-w-4xl"
      />
      <div
        {...reveal(3)}
        className="border-border mt-5 overflow-hidden rounded-xl border sm:mt-12 sm:rounded-2xl lg:mt-8"
      >
        <table className="w-full table-fixed text-left text-[13px] leading-[1.125rem] sm:text-sm sm:leading-6">
          <colgroup>
            <col className="w-[34%] sm:w-[26%]" />
            <col />
            <col className="w-[26%] sm:w-[32%]" />
          </colgroup>
          <thead className="text-xs sm:text-sm">
            <tr className="bg-muted/60">
              <th scope="col" className={comparisonCell}>
                <span className="sr-only">Kebutuhan</span>
              </th>
              <th
                scope="col"
                className={cn(
                  comparisonCell,
                  "text-muted-foreground font-medium",
                )}
              >
                Bangun sendiri
              </th>
              <th
                scope="col"
                className={cn(comparisonCell, "bg-muted font-medium")}
              >
                Dengan Hakgyo
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.map(([need, diy, hakgyo]) => (
              <tr key={need} className="border-border border-t">
                <th scope="row" className={cn(comparisonCell, "font-medium")}>
                  {need}
                </th>
                <td className={cn(comparisonCell, "text-muted-foreground")}>
                  <span className="flex items-start gap-2.5">
                    <XIcon
                      className="mt-1 hidden size-4 shrink-0 opacity-60 sm:block"
                      aria-hidden="true"
                    />
                    {diy}
                  </span>
                </td>
                <td className={cn(comparisonCell, "bg-muted/60")}>
                  <span className="flex items-start gap-2.5">
                    <CheckIcon
                      className="text-primary mt-1 hidden size-4 shrink-0 sm:block"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-medium">Gratis</span>
                      <span className="text-muted-foreground hidden sm:block">
                        {hakgyo}
                      </span>
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-border border-t">
              <th scope="row" className={cn(comparisonCell, "font-medium")}>
                Total biaya
              </th>
              <td
                className={cn(
                  comparisonCell,
                  "text-base font-semibold tracking-tight sm:text-2xl",
                )}
              >
                Puluhan juta rupiah
              </td>
              <td
                className={cn(
                  comparisonCell,
                  "bg-primary text-primary-foreground text-base font-semibold tracking-tight sm:text-2xl",
                )}
              >
                Gratis
                <span className="block text-[10px] font-normal tracking-normal opacity-70 sm:ml-1 sm:inline sm:align-super sm:text-xs">
                  *limited
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Slide>
  );
}
