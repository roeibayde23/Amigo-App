"use client";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { GearIcon } from "./icons";
import { longDate } from "@/lib/dates";

export default function Topbar() {
  const { s, lang, today, openSheet } = useApp();
  return (
    <div className="topbar">
      <Link href="/" className="brand-name" style={{ textDecoration: "none" }}>Amigo</Link>
      <div className="topbar-right">
        <span className="brand-date" suppressHydrationWarning>{longDate(today, s, lang)}</span>
        <button className="icon-btn" aria-label={s.settings} onClick={() => openSheet("settings")}>
          <GearIcon />
        </button>
      </div>
    </div>
  );
}
