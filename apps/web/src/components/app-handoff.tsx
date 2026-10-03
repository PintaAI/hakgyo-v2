"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  CheckIcon,
  LoaderCircleIcon,
  QrCodeIcon,
  SmartphoneIcon,
} from "lucide-react";

import { CourseCover } from "~/components/course-cover";
import { buttonVariants } from "~/components/ui/button";
import {
  androidCourseIntent,
  appCourseDeepLink,
  detectHandoffPlatform,
  mobileAppStoreLinks,
  type HandoffPlatform,
} from "~/lib/mobile-app";
import { cn } from "~/lib/utils";

const subscribeToNothing = () => () => undefined;
// When the app opens, the browser tab is hidden. If it is still visible after
// this long, the app most likely is not installed (or the user dismissed the
// "Open in Hakgyo?" prompt), so the install help is shown.
const APP_OPEN_TIMEOUT_MS = 2000;

type OpenState = "idle" | "opening" | "missing";

export function AppHandoff({
  courseId,
  pageUrl,
  appMissing,
  course,
  account,
  qrCode,
}: {
  courseId: string;
  pageUrl: string;
  appMissing: boolean;
  course: {
    title: string;
    thumbnailUrl: string | null;
    organizationName: string;
  } | null;
  account: { email: string; method: "email" | "google" } | null;
  qrCode: ReactNode;
}) {
  const platform = useSyncExternalStore<HandoffPlatform | null>(
    subscribeToNothing,
    () => detectHandoffPlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => null,
  );
  const [openState, setOpenState] = useState<OpenState>(
    appMissing ? "missing" : "idle",
  );
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const isDesktop = platform === "desktop";
  const openHref =
    platform === "android"
      ? androidCourseIntent(courseId, `${pageUrl}?app=missing`)
      : appCourseDeepLink(courseId);

  function watchAppOpen() {
    // Android intents fall back to `?app=missing` on their own.
    if (platform === "android") return;
    cleanupRef.current?.();
    setOpenState("opening");

    let leftPage = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") leftPage = true;
    };
    const onPageHide = () => {
      leftPage = true;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    const timer = window.setTimeout(() => {
      cleanup();
      setOpenState(leftPage ? "idle" : "missing");
    }, APP_OPEN_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      cleanupRef.current = null;
    }
    cleanupRef.current = cleanup;
  }

  const accountHint = account
    ? account.method === "google"
      ? `Masuk lewat Google dengan ${account.email}.`
      : `Masuk dengan ${account.email} dan kata sandi yang tadi kamu buat.`
    : "Masuk dengan akun Hakgyo yang sama.";

  return (
    <main className="bg-background text-foreground min-h-screen px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md md:max-w-4xl">
        <header className="mb-5 flex items-center gap-2.5 sm:mb-8">
          <span className="bg-foreground text-background grid size-8 place-items-center rounded-lg">
            <BookOpenIcon className="size-4" />
          </span>
          <span className="font-heading text-base font-medium tracking-tight">
            Hakgyo
          </span>
        </header>

        <div className="grid items-start gap-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="relative flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-xl bg-neutral-950 p-5 text-white sm:min-h-[20rem] sm:p-8">
            {course ? (
              <CourseCover
                title={course.title}
                thumbnailUrl={course.thumbnailUrl}
                priority
                sizes="(max-width: 768px) 100vw, 560px"
                className="absolute inset-0"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-black/65" />
            <div className="relative">
              {course ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <CheckIcon className="size-3.5" />
                    Akses belajar aktif
                  </span>
                  <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">
                    {course.organizationName}
                  </p>
                </>
              ) : null}
              <h1 className="font-heading mt-2 text-2xl leading-tight font-medium tracking-tight sm:text-4xl">
                {course ? course.title : "Belajar di aplikasi Hakgyo"}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                Materi, latihan, dan progres belajar ada di aplikasi Hakgyo.
                Lanjutkan di HP kamu.
              </p>
            </div>
          </section>

          <section className="bg-card ring-foreground/10 flex flex-col gap-5 rounded-xl p-5 ring-1 sm:p-6">
            {isDesktop ? (
              <div>
                <h2 className="font-heading flex items-center gap-2 text-lg font-medium">
                  <QrCodeIcon className="size-4" />
                  Scan dengan HP
                </h2>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  Arahkan kamera HP ke kode ini untuk membuka halaman yang sama
                  di HP, lalu lanjut ke aplikasi.
                </p>
                <div className="mx-auto mt-5 w-44 rounded-lg bg-white p-3 text-black">
                  {qrCode}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="font-heading text-lg font-medium">
                  Lanjut di aplikasi
                </h2>
                <a
                  href={openHref}
                  onClick={watchAppOpen}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-4 h-12 w-full text-base",
                  )}
                >
                  {openState === "opening" ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <SmartphoneIcon data-icon="inline-start" />
                  )}
                  {openState === "missing"
                    ? "Coba buka lagi"
                    : openState === "opening"
                      ? "Membuka aplikasi…"
                      : "Buka aplikasi Hakgyo"}
                </a>
                {openState === "missing" ? (
                  <p
                    role="status"
                    className="bg-muted text-muted-foreground mt-3 rounded-lg px-3 py-2.5 text-sm leading-relaxed"
                  >
                    Aplikasi belum terbuka? Pasang Hakgyo dulu, lalu ketuk
                    tombol di atas sekali lagi.
                  </p>
                ) : null}
              </div>
            )}

            <ol className="grid gap-3">
              {[
                {
                  title: "Pasang aplikasi Hakgyo",
                  body: <StoreBadges />,
                },
                {
                  title: isDesktop ? "Buka halaman ini di HP" : "Buka aplikasi",
                  body: null,
                },
                { title: accountHint, body: null },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="bg-muted text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed">
                    {step.title}
                    {step.body}
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
              Kursus ini otomatis muncul di tab Belajar setelah kamu masuk.
            </p>
          </section>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

function StoreBadges() {
  const stores = [
    { name: "App Store", href: mobileAppStoreLinks.appStore },
    { name: "Google Play", href: mobileAppStoreLinks.playStore },
  ];

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {stores.map((store) =>
        store.href ? (
          <a
            key={store.name}
            href={store.href}
            className="bg-foreground text-background rounded-lg px-3 py-2 leading-tight"
          >
            <span className="block text-[10px] opacity-70">Unduh di</span>
            <span className="block text-sm font-semibold">{store.name}</span>
          </a>
        ) : (
          <span
            key={store.name}
            aria-disabled="true"
            className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2 leading-tight"
          >
            <span className="block text-[10px]">Segera hadir di</span>
            <span className="block text-sm font-semibold">{store.name}</span>
          </span>
        ),
      )}
    </div>
  );
}
