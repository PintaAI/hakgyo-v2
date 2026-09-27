import { DeviceList } from "~/components/notifications/device-list";
import { InboxList } from "~/components/notifications/inbox-list";
import { PushSettingsCard } from "~/components/notifications/push-settings-card";
import { PageHeader } from "~/components/ui/page-header";

export const metadata = {
  title: "Notifikasi",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Notifikasi"
        description="Kotak masuk dibagikan ke semua perangkatmu — dibaca di satu tempat, terbaca di semua tempat."
      />
      <InboxList />
      <PushSettingsCard />
      <DeviceList />
    </div>
  );
}
