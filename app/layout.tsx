import type { Metadata, Viewport } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://notedwork.vercel.app"),
  title: "notedwork — Email & Jadwal Mahasiswa",
  description: "Dashboard email dan jadwal kuliah mahasiswa — login dengan Google untuk memakai.",
  applicationName: "notedwork",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "notedwork",
  },
  openGraph: {
    title: "notedwork — Email & Jadwal Mahasiswa",
    description: "Dashboard email dan jadwal kuliah mahasiswa.",
    type: "website",
    locale: "id_ID",
    siteName: "notedwork",
  },
  twitter: {
    card: "summary",
    title: "notedwork — Email & Jadwal Mahasiswa",
    description: "Dashboard email dan jadwal kuliah mahasiswa.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  colorScheme: "dark light",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body className={`${poppins.variable} ${jetbrainsMono.variable}`}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
