/**
 * Mobile category strip glyph — 22×22 line icon (slightly smaller than
 * the desktop variant). Nine kinds; PC version has eight (no 명소).
 */

export type MobileCategoryKind =
  | 'all'
  | 'color'
  | 'skin'
  | 'hair'
  | 'photo'
  | 'makeup'
  | 'kpop'
  | 'food'
  | 'hotel'
  | 'spot';

export function MobileCategoryIcon({
  kind,
  stroke,
}: {
  kind: MobileCategoryKind;
  stroke: string;
}): JSX.Element {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke,
    strokeWidth: 1.5,
  };
  switch (kind) {
    case 'all':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case 'color':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="9" cy="9" r="1.4" fill={stroke} />
          <circle cx="15" cy="9" r="1.4" fill={stroke} />
          <circle cx="9.5" cy="15" r="1.4" fill={stroke} />
        </svg>
      );
    case 'skin':
      return (
        <svg {...common}>
          <path d="M12 3c3 4 5 6.5 5 9.5A5 5 0 0 1 7 12.5C7 9.5 9 7 12 3z" />
        </svg>
      );
    case 'hair':
      // 가위 — 헤어샵
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="M8 7.5L20 18M8 16.5L20 6" />
        </svg>
      );
    case 'photo':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2.5" />
          <circle cx="12" cy="13.5" r="3.5" />
        </svg>
      );
    case 'makeup':
      return (
        <svg {...common}>
          <path d="M5 19l9-9M11 7l3-3 4 4-3 3M14 10l4 4-3 3-4-4" />
        </svg>
      );
    case 'kpop':
      return (
        <svg {...common}>
          <path d="M9 18V6l11-2v12" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="17" cy="16" r="2.5" />
        </svg>
      );
    case 'food':
      return (
        <svg {...common}>
          <path d="M6 3v8a2 2 0 0 0 2 2v8M6 3v5M9 3v5M16 3c-1.5 0-2 3-2 6s.5 3 2 3v9" />
        </svg>
      );
    case 'hotel':
      return (
        <svg {...common}>
          <path d="M3 20V9l9-5 9 5v11M3 20h18M9 20v-5h6v5" />
        </svg>
      );
    case 'spot':
      return (
        <svg {...common}>
          <path d="M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
          <path d="M3 21h18" />
        </svg>
      );
  }
}
