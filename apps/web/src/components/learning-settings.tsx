"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

/**
 * Account-wide learning settings in Pengaturan. Unlike the appearance
 * settings these are stored on the server and apply to web and the app.
 */
export function LearningSettings({
  showHangeulAfterMastery,
}: {
  showHangeulAfterMastery: boolean;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const setShow = api.preferences.setShowHangeulAfterMastery.useMutation({
    onMutate: async ({ show }) => {
      await utils.preferences.get.cancel();
      const previous = utils.preferences.get.getData();
      utils.preferences.get.setData(undefined, (current) =>
        current
          ? {
              ...current,
              showHangeulAfterMastery: show,
              hangeulHidden: current.hangeulMastered && !show,
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      utils.preferences.get.setData(undefined, context?.previous);
      toast.error(
        "Pengaturan belum tersimpan. Periksa koneksi lalu coba lagi.",
      );
    },
    onSuccess: (data) => {
      utils.preferences.get.setData(undefined, data);
      // The learner sidebar is rendered on the server.
      router.refresh();
    },
  });

  return (
    <div className="grid gap-8 p-5 sm:p-7">
      <section className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="grid gap-1">
          <Label htmlFor="show-hangeul-after-mastery">
            Tampilkan Hangeul Mastery
          </Label>
          <p className="text-muted-foreground text-xs">
            Kamu sudah menguasai Hangeul. Nyalakan untuk menampilkan lagi
            kurikulum dan game Hangeul di daftar belajarmu.
          </p>
        </div>
        <Switch
          id="show-hangeul-after-mastery"
          aria-label="Tampilkan Hangeul Mastery"
          checked={showHangeulAfterMastery}
          disabled={setShow.isPending}
          onCheckedChange={(checked) => setShow.mutate({ show: checked })}
          className="mt-1"
        />
      </section>
      <p className="text-muted-foreground text-xs">
        Tersimpan di akunmu dan berlaku di web serta aplikasi Hakgyo.
      </p>
    </div>
  );
}
