import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { sw?: number };
const base = (sw = 1.8): SVGProps<SVGSVGElement> => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const MailIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const CalendarIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const TasksIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
export const BulbIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2z" /></svg>
);
export const GearIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw ?? 2)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
export const ChevronRight = ({ sw, ...p }: P) => (
  <svg {...base(sw ?? 2.2)} {...p}><path d="M9 18l6-6-6-6" /></svg>
);
export const ChevronLeft = ({ sw, ...p }: P) => (
  <svg {...base(sw ?? 2.2)} {...p}><path d="M15 18l-6-6 6-6" /></svg>
);
export const PlusIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw ?? 2.2)} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
);
export const CheckIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw ?? 3)} {...p}><path d="M20 6L9 17l-5-5" /></svg>
);
export const PencilIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
);
export const LinkIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
);
export const PersonIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></svg>
);
export const FileIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
);
export const RepeatIcon = ({ sw, ...p }: P) => (
  <svg {...base(sw)} {...p}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
);

/** Arrow pointing "back" for the current direction (right in RTL, left in LTR). */
export const BackChevron = ({ rtl, ...p }: P & { rtl: boolean }) => (rtl ? <ChevronRight {...p} /> : <ChevronLeft {...p} />);
