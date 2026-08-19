import "~/styles/globals.css";

import { type Metadata } from "next";
import {
  Geist,
  Inter,
  JetBrains_Mono,
  Merriweather,
  Poppins,
} from "next/font/google";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/sonner";
import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "Hakgyo | Ruang belajar yang tumbuh bersama",
    template: "%s | Hakgyo",
  },
  description:
    "Platform belajar untuk mengelola course, materi, tugas, cohort, dan perkembangan peserta dalam satu tempat.",
  keywords: [
    "platform belajar online",
    "learning management system",
    "course online",
    "kelas online",
    "Hakgyo",
  ],
  applicationName: "Hakgyo",
  authors: [{ name: "Hakgyo" }],
  creator: "Hakgyo",
  publisher: "Hakgyo",
  formatDetection: { email: false, address: false, telephone: false },
  robots: { index: true, follow: true },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
