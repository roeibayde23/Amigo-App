"use client";
import { useApp } from "./AppProvider";

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
      {toast}
    </div>
  );
}
