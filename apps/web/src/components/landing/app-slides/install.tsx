import Image from "next/image";
import { SmartphoneIcon } from "lucide-react";

import { mobileAppStoreLinks } from "~/lib/mobile-app";

import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";

const platforms = [
  {
    name: "iPhone",
    href: mobileAppStoreLinks.testFlight,
    action: "Buka TestFlight",
    icon: <SmartphoneIcon className="size-6" aria-hidden="true" />,
    steps: [
      "Ketuk Unduh untuk iPhone di halaman ini.",
      "Pasang aplikasi TestFlight dari App Store, lalu kembali ke halaman ini.",
      "Ketuk lagi Unduh untuk iPhone, lalu Terima dan Pasang.",
      "Buka Hakgyo dan masuk dengan akunmu.",
    ],
  },
  {
    name: "Android",
    href: mobileAppStoreLinks.androidApk,
    action: "Unduh APK",
    icon: (
      <Image
        src="/brands/android-head.svg"
        alt=""
        width={152}
        height={89}
        className="h-auto w-8"
      />
    ),
    steps: [
      "Ketuk Unduh untuk Android, lalu tunggu file APK selesai terunduh.",
      "Buka file Hakgyo dari notifikasi unduhan.",
      "Jika diminta, izinkan browser memasang aplikasi, lalu ketuk Pasang.",
      "Buka Hakgyo dan masuk dengan akunmu.",
    ],
  },
];

/** How to install the beta on each platform. */
export function AppInstallSlide() {
  return (
    <Slide id="pasang">
      <SlideHeading
        id="pasang"
        title="Pasang dalam"
        muted="beberapa langkah."
        description="Selama Hakgyo belum ada di App Store dan Google Play, pasang versi beta dengan cara berikut."
        descriptionOnPhones={false}
        className="max-w-4xl"
      />
      <div className="mt-6 grid gap-3 sm:mt-12 md:grid-cols-2 md:gap-4">
        {platforms.map(({ name, href, action, icon, steps }, index) => (
          <section
            key={name}
            {...reveal(3 + index)}
            aria-labelledby={`pasang-${name}`}
            className="border-border bg-card flex flex-col rounded-2xl border p-4 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="bg-secondary grid size-11 place-items-center rounded-xl">
                {icon}
              </span>
              <h3
                id={`pasang-${name}`}
                className="text-xl font-medium tracking-tight sm:text-2xl"
              >
                {name}
              </h3>
            </div>
            <ol className="mt-4 grid gap-2.5 sm:mt-8 sm:gap-4">
              {steps.map((step, stepIndex) => (
                <li key={step} className="flex gap-3">
                  <span className="text-muted-foreground w-5 shrink-0 font-mono text-xs leading-6 sm:text-sm">
                    0{stepIndex + 1}
                  </span>
                  <span className="text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            {href ? (
              <a
                href={href}
                className="text-primary mt-4 self-start text-sm font-medium underline-offset-4 hover:underline sm:mt-8"
              >
                {action}
              </a>
            ) : null}
          </section>
        ))}
      </div>
    </Slide>
  );
}
