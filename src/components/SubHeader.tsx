"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useApp } from "./AppProvider";
import { BackChevron } from "./icons";
import { longDate } from "@/lib/dates";

/** Back button (to dashboard) + either today's date or custom content. */
export default function SubHeader({ children }: { children?: ReactNode }) {
  const { s, lang, today } = useApp();
  return (
    <div className="subhead-row">
      <Link href="/" className="sq-btn" aria-label={s.back}>
        <BackChevron rtl={lang === "he"} />
      </Link>
      {children ?? <span className="subhead-date" suppressHydrationWarning>{longDate(today, s, lang)}</span>}
    </div>
  );
}
