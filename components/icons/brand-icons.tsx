import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

const base = (props: IconProps) => ({
  width: props.size ?? 20,
  height: props.size ?? 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

/* ─────────── Core Icons ─────────── */
export const LayoutDashboard = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </svg>
);

export const BarChart3 = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 21h18" />
    <rect x="4" y="9" width="4" height="8" rx="1" />
    <rect x="10" y="5" width="4" height="12" rx="1" />
    <rect x="16" y="12" width="4" height="5" rx="1" />
  </svg>
);

export const Activity = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12h3l2.5 5 4-10 2.5 5H21" />
  </svg>
);

/* ─────────── Wallet & Accounts ─────────── */
export const Wallet = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M17 12h4v4h-4a2 2 0 0 1 0-4Z" />
    <path d="M7 8h10" />
  </svg>
);

export const Wallet2 = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <path d="M16 12h6M8 8h8" />
  </svg>
);

/* ─────────── User & Client ─────────── */
export const Users = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16 21v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
    <circle cx="10" cy="7" r="3" />
    <path d="M20 21v-1a5 5 0 0 0-4-4" />
    <circle cx="17" cy="7" r="3" />
  </svg>
);

export const UsersRound = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="7" r="3.2" />
    <path d="M4 19a8 8 0 0 1 16 0" />
  </svg>
);

export const UserCircle2 = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>
);

/* ─────────── Files & Reports ─────────── */
export const FileText = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12V9z" />
    <path d="M14 3v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);

export const FilePlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 11v6M9 14h6" />
  </svg>
);

export const ClipboardList = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M9 17h6M9 13h6" />
    <rect x="3" y="7" width="18" height="14" rx="2" />
  </svg>
);

export const NotebookText = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 10h8M8 14h5" />
  </svg>
);

export const Notebook = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16" />
  </svg>
);

/* ─────────── System & Alerts ─────────── */
export const AlertTriangle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.3 3.9 2.6 17.1A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const HelpCircle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.9 9a2.1 2.1 0 1 1 3.6 1.5c-.7.6-1.4 1-1.4 2.1" />
    <circle cx="12" cy="17" r=".8" />
  </svg>
);

export const LifeBuoy = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M5.7 5.7l3 3M18.3 5.7l-3 3M5.7 18.3l3-3M18.3 18.3l-3-3" />
  </svg>
);

export const BellRing = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 20h8a2 2 0 0 1-4 0m0-16a6 6 0 0 1 6 6v4l2 2H4l2-2v-4a6 6 0 0 1 6-6Z" />
  </svg>
);

/* ─────────── Navigation & Actions ─────────── */
export const LogOut = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/* ─────────── Views, Reports, Trades ─────────── */
export const Eye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const History = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 9-9v3l-4-4 4-4v3a9 9 0 0 1 0 18" />
  </svg>
);

export const ListOrdered = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 6h11M10 12h11M10 18h11M4 6h1v2H4zM3 12h2v2H3zM4 18h1v2H4z" />
  </svg>
);

export const Rows3 = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="18" height="4" rx="1" />
    <rect x="3" y="16" width="18" height="4" rx="1" />
  </svg>
);

export const Clock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

export const Scale = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v18M3 9l9-6 9 6" />
    <path d="M6 9l-3 7h6l-3-7Zm12 0l-3 7h6l-3-7Z" />
  </svg>
);

export const TrendingUp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </svg>
);

export const TrendingDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M14 17h7v-7" />
  </svg>
);

export const ArrowLeftRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3 4 7l4 4M16 17l4 4-4 4M4 7h16M4 17h16" />
  </svg>
);

export const ArrowUpDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 19V5m0 0-4 4m4-4 4 4m0 6-4 4m4-4-4-4" />
  </svg>
);

export const Upload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 17v3h16v-3M12 12V4m0 0l-4 4m4-4 4 4" />
  </svg>
);

export const Download = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 17v3h16v-3M12 5v8m0 0-4-4m4 4 4-4" />
  </svg>
);

export const Image = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export default {};
