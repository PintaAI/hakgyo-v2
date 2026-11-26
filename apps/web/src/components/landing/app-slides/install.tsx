import type { ReactNode } from "react";
import Image from "next/image";
import { SmartphoneIcon } from "lucide-react";

import { mobileAppStoreLinks } from "~/lib/mobile-app";

import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";

type Step = { text: string; link?: { href: string; label: string } };

const androidBeta = mobileAppStoreLinks.androidBeta;

const platforms: {
  name: string;
  icon: ReactNode;
  steps: Step[];
  action?: { href: string; label: string };
}[] = [
  {
    name: "iPhone",
    icon: <SmartphoneIcon className="size-6" aria-hidden="true" />,
    steps: [
      { text: "Ketuk Unduh untuk iPhone di halaman ini." },
      {
        text: "Pasang aplikasi TestFlight dari App Store, lalu kembali ke halaman ini.",
      },
      { text: "Ketuk lagi Unduh untuk iPhone, lalu Terima dan Pasang." },
      { text: "Buka Hakgyo dan masuk dengan akunmu." },
    ],
    ...(mobileAppStoreLinks.testFlight
      ? {
          action: {
            href: mobileAppStoreLinks.testFlight,
            label: "Buka TestFlight",
          },
        }
      : {}),
  },
  {
    name: "Android",
    icon: (
      <Image
        src="/brands/android-head.svg"
        alt=""
        width={152}
        height={89}
        className="h-auto w-8"
      />
    ),
    // The Play beta is a closed test: only members of its Google Group can
    // opt in, and only testers can install from the listing.
    steps: androidBeta
      ? [
          {
            text: "Buka di Chrome, masuk dengan akun Google yang dipakai di Play Store ponselmu, lalu gabung grup Hakgyo Beta Testers.",
            link: { href: androidBeta.group, label: "Gabung grup" },
          },
          {
            text: "Buka halaman pengujian dengan akun yang sama, ketuk Jadi penguji (Become a tester), lalu tunggu sampai muncul Anda adalah penguji (You are a tester).",
            link: { href: androidBeta.optIn, label: "Jadi penguji" },
          },
          {
            // "Item not found" here means Play uses another account or the
            // opt-in was skipped; the listing exists only for testers.
            text: "Pasang Hakgyo dari Google Play. Di Play Store, ketuk foto profil di kanan atas dan pastikan akunnya sama dengan akun di langkah 1 dan 2.",
            link: { href: androidBeta.install, label: "Buka Google Play" },
          },
          { text: "Buka Hakgyo dan masuk dengan akunmu." },
        ]
      : [{ text: "Versi Android segera hadir." }],
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
        {platforms.map(({ name, icon, steps, action }, index) => (
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
              {steps.map(({ text, link }, stepIndex) => (
                <li key={text} className="flex gap-3">
                  <span className="text-muted-foreground w-5 shrink-0 font-mono text-xs leading-6 sm:text-sm">
                    0{stepIndex + 1}
                  </span>
                  <span className="text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
                    {text}
                    {link ? (
                      <>
                        {" "}
                        <a
                          href={link.href}
                          className="text-primary font-medium whitespace-nowrap underline-offset-4 hover:underline"
                        >
                          {link.label}
                        </a>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
            {action ? (
              <a
                href={action.href}
                className="text-primary mt-4 self-start text-sm font-medium underline-offset-4 hover:underline sm:mt-8"
              >
                {action.label}
              </a>
            ) : null}
          </section>
        ))}
      </div>
    </Slide>
  );
}
