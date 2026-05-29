const s = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const icons = {
  merge: s('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/>'),
  split: s('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16" stroke-dasharray="2 2"/>'),
  compress: s('<path d="M9 9 4 4m0 0v4m0-4h4"/><path d="m15 15 5 5m0 0v-4m0 4h-4"/><path d="M15 9l5-5m0 0v4m0-4h-4"/><path d="M9 15l-5 5m0 0v-4m0 4h4"/>'),
  toImg: s('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  toPdf: s('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>'),
  upload: s('<path d="M12 16V4m0 0 4 4m-4-4-4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  file: s('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'),
  up: s('<path d="m18 15-6-6-6 6"/>'),
  down: s('<path d="m6 9 6 6 6-6"/>'),
  trash: s('<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>'),
  download: s('<path d="M12 4v12m0 0 4-4m-4 4-4-4"/><path d="M4 18v2h16v-2"/>'),
  check: s('<path d="M20 6 9 17l-5-5"/>'),
  arrow: s('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
  watermark: s('<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z"/>'),
  pages: s('<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>'),
  text: s('<path d="M5 5h14M5 10h14M5 15h9"/>'),
  rotate: s('<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v5h-5"/>'),
  copy: s('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
};

export type IconName = keyof typeof icons;
