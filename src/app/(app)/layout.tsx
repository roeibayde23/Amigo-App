import { cookies } from "next/headers";
import type { ReactNode } from "react";
import AppProvider from "@/components/AppProvider";
import MicSheet from "@/components/MicSheet";
import SettingsSheet from "@/components/SettingsSheet";
import Toast from "@/components/Toast";
import Topbar from "@/components/Topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const langCookie = jar.get("amigo_lang")?.value;
  const lang = langCookie === "en" ? "en" : "he";
  const dark = jar.get("amigo_dark")?.value === "1";
  return (
    <AppProvider initialLang={lang} initialDark={dark} hasPrefCookie={!!langCookie}>
      <div className="app">
        <Topbar />
        <div className="inner">{children}</div>
      </div>
      <MicSheet />
      <SettingsSheet />
      <Toast />
    </AppProvider>
  );
}
