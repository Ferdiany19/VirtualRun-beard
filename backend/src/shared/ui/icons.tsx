import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "arrow-right"
  | "bib"
  | "calendar"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "clipboard"
  | "crosshair"
  | "download"
  | "document"
  | "eye"
  | "flag"
  | "footsteps"
  | "gift"
  | "grid"
  | "home"
  | "image"
  | "info"
  | "mail"
  | "medal"
  | "menu"
  | "phone"
  | "plus"
  | "runner"
  | "search"
  | "settings"
  | "shield"
  | "upload"
  | "user"
  | "users"
  | "x";

const paths: Record<IconName, ReactNode> = {
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  bib: (
    <>
      <rect height="16" rx="2" width="16" x="4" y="4" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3v4M17 3v4M4 9h16" />
      <rect height="17" rx="2" width="16" x="4" y="5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  clipboard: (
    <>
      <path d="M9 5h6" />
      <path d="M9 13h6M9 17h4" />
      <rect height="18" rx="2" width="14" x="5" y="3" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 5h10l-1.5 4L16 13H6" />
    </>
  ),
  footsteps: (
    <>
      <ellipse cx="8" cy="7" rx="3" ry="5" transform="rotate(-25 8 7)" />
      <ellipse cx="16" cy="17" rx="3" ry="5" transform="rotate(-25 16 17)" />
    </>
  ),
  gift: (
    <>
      <rect height="10" rx="2" width="16" x="4" y="10" />
      <path d="M12 10v10M4 14h16M7 10c-1.5-1.2-1.5-4 1-4 2 0 3 4 4 4M17 10c1.5-1.2 1.5-4-1-4-2 0-3 4-4 4" />
    </>
  ),
  grid: (
    <>
      <rect height="6" rx="1" width="6" x="4" y="4" />
      <rect height="6" rx="1" width="6" x="14" y="4" />
      <rect height="6" rx="1" width="6" x="4" y="14" />
      <rect height="6" rx="1" width="6" x="14" y="14" />
    </>
  ),
  home: (
    <>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  image: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 3 3 2-2 6 5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  mail: (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  medal: (
    <>
      <path d="m8 3 4 6 4-6" />
      <circle cx="12" cy="15" r="6" />
      <path d="m10 15 1.4 1.4L14.5 13" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  phone: (
    <path d="M6.6 3h3l1.5 4-2 1.5a15 15 0 0 0 6.4 6.4l1.5-2 4 1.5v3c0 2-1.6 3.6-3.6 3.6C9.4 21 3 14.6 3 6.6 3 4.6 4.6 3 6.6 3Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  runner: (
    <>
      <circle cx="14" cy="4.5" r="2" />
      <path d="m12.5 7.5-3 4 4 2 2.5 5.5" />
      <path d="m10 12-5 2M13.5 13.5 18 10" />
      <path d="m9.5 16-3 4M16 19l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.8-4 14.2-4 16 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c1.2-4 10.8-4 12 0" />
      <path d="M16 6.5a3 3 0 0 1 0 5M17 14c2.2.4 3.5 1.5 4 3.5" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

export function Icon({ name, className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
