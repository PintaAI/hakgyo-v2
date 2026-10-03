import { Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import type { LocalDataStats } from "../sync/store";
import type { ResyncReport } from "../sync/types";
import { withOpacity } from "../theme/colors";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDuration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text className="shrink text-sm text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

/**
 * Development-only panel under "Clear local data & resync": what the local
 * SQLite database holds, and how long the last resync took to repopulate it.
 */
export function LocalDataReport({
  stats,
  report,
  courseTitles,
  isSyncing,
}: {
  stats: LocalDataStats | null;
  report: ResyncReport | null;
  courseTitles: Record<string, string>;
  isSyncing: boolean;
}) {
  const { colorScheme, colors } = useAppTheme();
  const downloaded = report?.bundles.filter(
    (bundle) => bundle.status === "downloaded",
  );
  const downloadedBytes =
    downloaded?.reduce((sum, bundle) => sum + bundle.bytes, 0) ?? 0;

  return (
    <View
      className="gap-3 px-4 py-3"
      style={{
        backgroundColor: withOpacity(
          colors.mutedForeground,
          colorScheme === "dark" ? 0.18 : 0.1,
        ),
      }}
    >
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tersimpan di perangkat ini
        </Text>
        {stats ? (
          <>
            <Line
              label="Paket kursus"
              value={`${stats.bundles.count} · ${formatBytes(stats.bundles.bytes)}`}
            />
            <Line
              label="Indeks pelajar"
              value={`${stats.indexes.count} · ${formatBytes(stats.indexes.bytes)}`}
            />
            <Line
              label="Layar tersimpan"
              value={`${stats.queries.count} · ${formatBytes(stats.queries.bytes)}`}
            />
            <Line
              label="Perubahan antre / gagal"
              value={`${stats.operations} / ${stats.deadLetters}`}
            />
          </>
        ) : (
          <Text className="text-sm text-muted-foreground">Memuat…</Text>
        )}
      </View>

      {isSyncing ? (
        <Text className="text-sm text-muted-foreground">
          Menghapus dan memuat ulang…
        </Text>
      ) : report ? (
        <View className="gap-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Last resync ·{" "}
            {new Date(report.startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </Text>
          <Line label="Total" value={formatDuration(report.totalMs)} />
          <Line
            label="Kirim progres yang antre"
            value={formatDuration(report.flushMs)}
          />
          <Line
            label="Hapus data lokal"
            value={formatDuration(report.clearMs)}
          />
          <Line
            label="Manifest + indeks"
            value={formatDuration(report.indexMs)}
          />
          <Line
            label={`Paket kursus (${downloaded?.length ?? 0}, ${formatBytes(downloadedBytes)})`}
            value={formatDuration(report.bundlesMs)}
          />
          {report.bundles.map((bundle, position) => (
            <View key={`${bundle.courseId}-${position}`} className="pl-3">
              <Line
                label={courseTitles[bundle.courseId] ?? bundle.courseId}
                value={
                  bundle.status === "downloaded"
                    ? `${formatDuration(bundle.fetchMs)} + ${formatDuration(bundle.saveMs)} · ${formatBytes(bundle.bytes)}`
                    : bundle.status === "not-modified"
                      ? `tidak berubah · ${formatDuration(bundle.fetchMs)}`
                      : "gagal"
                }
              />
            </View>
          ))}
          <Text className="pt-1 text-xs text-muted-foreground">
            Per kursus: unduh (build server + jaringan) + simpan ke SQLite.
          </Text>
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">
          Jalankan sinkronisasi ulang untuk mengukur kecepatan perangkat memuat
          ulang data.
        </Text>
      )}
    </View>
  );
}
