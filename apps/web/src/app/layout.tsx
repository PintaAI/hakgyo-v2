import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import {
  Geist,
  Inter,
  JetBrains_Mono,
  Merriweather,
  Poppins,
} from "next/font/google";
import { ThemeProvider } from "next-themes";

import { MaintenanceBanner } from "~/components/maintenance/maintenance-banner";
import { MaintenanceGate } from "~/components/maintenance/maintenance-gate";
import { MaintenancePage } from "~/components/maintenance/maintenance-page";
import { PwaProvider } from "~/components/pwa/serwist-provider";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/sonner";
import { env } from "~/env";
import { isSuperadminEmail } from "~/server/authorization/superadmin";
import { isActiveUser } from "~/server/better-auth/active-user";
import { getSession } from "~/server/better-auth/server";
import { getMaintenanceState } from "~/server/maintenance";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "Hakgyo | Ruang belajar yang tumbuh bersama",
    template: "%s | Hakgyo",
  },
  description:
    "Platform belajar untuk mengelola kurikulum, materi, tugas, cohort, dan perkembangan peserta dalam satu tempat.",
  keywords: [
    "platform belajar online",
    "learning management system",
    "kurikulum online",
    "kelas online",
    "Hakgyo",
  ],
  applicationName: "Hakgyo",
  authors: [{ name: "Hakgyo" }],
  creator: "Hakgyo",
  publisher: "Hakgyo",
  formatDetection: { email: false, address: false, telephone: false },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hakgyo",
  },
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icons/apple-touch-icon-180.png" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

// Only Geist is the default. The next four apply when a user picks them in
// their preferences, so they load on first use instead of preloading on every
// page.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  preload: false,
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  preload: false,
});

/**
 * Superadmins see the real pages during `full` maintenance, like the API lets
 * them through. Only called in `full`; a failed lookup (the database may be
 * down) reads as signed out.
 */
async function isSuperadminViewer() {
  try {
    const session = await getSession();
    return (
      !!session &&
      isActiveUser(session.user) &&
      isSuperadminEmail(session.user.email)
    );
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const maintenance = await getMaintenanceState();
  // In `full`, pages other than sign-in and /superadmin show this instead.
  const gate =
    maintenance?.mode === "full" && !(await isSuperadminViewer())
      ? maintenance
      : null;
  return (
    <html
      lang="id"
      className={`${geist.variable} ${inter.variable} ${poppins.variable} ${merriweather.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <TRPCReactProvider>
              <PwaProvider>
                {maintenance ? <MaintenanceBanner state={maintenance} /> : null}
                {gate ? (
                  <MaintenanceGate page={<MaintenancePage state={gate} />}>
                    {children}
                  </MaintenanceGate>
                ) : (
                  children
                )}
              </PwaProvider>
            </TRPCReactProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
