import { DeviceList } from "~/components/notifications/device-list";
import { InboxList } from "~/components/notifications/inbox-list";
import { PushSettingsCard } from "~/components/notifications/push-settings-card";

export const metadata = {
  title: "Notifikasi",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        <p className="text-muted-foreground text-sm">
          Kotak masuk dibagikan ke semua perangkatmu — dibaca di satu tempat,
          terbaca di semua tempat.
        </p>
      </div>
      <InboxList />
      <PushSettingsCard />
      <DeviceList />
    </div>
  );
}
