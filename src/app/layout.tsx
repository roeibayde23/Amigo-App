import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Rubik } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], variable: "--font-rubik", display: "swap" });
const frank = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], variable: "--font-frank", display: "swap" });

export const metadata: Metadata = {
  title: "Amigo — העוזר האישי שלי",
  description: "Amigo – personal assistant for mail, schedule and tasks",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Amigo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6B1029",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const lang = jar.get("amigo_lang")?.value === "en" ? "en" : "he";
  const dark = jar.get("amigo_dark")?.value === "1";
  return (
    <html lang={lang} dir={lang === "he" ? "rtl" : "ltr"} className={`${rubik.variable} ${frank.variable}${dark ? " dark" : ""}`}>
      <body>{children}</body>
    </html>
  );
}
