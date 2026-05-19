/** Shared SVG icons for Encryptic Movies — stroke-based unless noted. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const EncrypticLogo = ({ style, size, className }) => (
  <img
    src="./encryptic-logo.png"
    alt="Project Encryptic Movies"
    className={className}
    style={{
      display: "block",
      flexShrink: 0,
      objectFit: "contain",
      ...(size != null
        ? { width: size, height: "auto", maxHeight: size * 1.4 }
        : {}),
      ...style,
    }}
  />
);

/** @deprecated use EncrypticLogo */
export const MovLogo = EncrypticLogo;

export const SearchIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M12 8v4l3 3" />
    <path d="M3.05 11a9 9 0 1 1 .5 4" />
    <path d="M3 3v5h5" />
  </svg>
);

export const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const BookmarkFillIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const FilmIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="17" y1="7" x2="22" y2="7" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="2" y1="17" x2="7" y2="17" />
  </svg>
);

export const TVIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17 2 12 7 7 2" />
  </svg>
);

export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
);

export const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

export const DownloadsQueueIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export const QuitIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const BackIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export const HelpIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export const WatchedIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const EyeIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const TrashIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const FolderIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

export const SubtitlesIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h4M7 11h10" />
  </svg>
);

export const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const WarningIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...stroke}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const TrailerIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polygon points="10 9 16 12 10 15 10 9" fill="currentColor" stroke="none" />
  </svg>
);

export const SourceIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const ShieldBlockIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...stroke}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
);

export const PopOutIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export const RatingShieldIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const RatingLockIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
