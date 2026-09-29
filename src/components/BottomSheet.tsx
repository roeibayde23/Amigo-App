"use client";
import { useEffect, type ReactNode } from "react";

export default function BottomSheet({
  open,
  onClose,
  title,
  closeLabel = "✕",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div className="sheet-titlerow">
          <h2>{title}</h2>
          <button className="close-x" onClick={onClose} aria-label={closeLabel}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
