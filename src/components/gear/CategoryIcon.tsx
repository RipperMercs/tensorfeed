import { IconKind } from '@/data/gear/types';

interface Props {
  kind: IconKind;
  size?: number;
}

/**
 * Custom geometric icon set for the 13 gear categories. Hand-drawn
 * stroke-1.4 SVGs, deliberately distinct from Lucide so the category cards
 * read as a unit. Color is inherited via currentColor.
 */
export default function CategoryIcon({ kind, size = 26 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'laptop':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="11" rx="1.5" />
          <path d="M2 18h20" />
          <path d="M9 11h6" />
        </svg>
      );
    case 'chip':
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
          <path d="M9 9h6v6H9z" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
        </svg>
      );
    case 'glasses':
      return (
        <svg {...common}>
          <circle cx="7" cy="13" r="3.5" />
          <circle cx="17" cy="13" r="3.5" />
          <path d="M10.5 13h3M2 11l2-3M22 11l-2-3" />
        </svg>
      );
    case 'robot':
      return (
        <svg {...common}>
          <rect x="5" y="9" width="14" height="10" rx="2" />
          <path d="M12 5v4M9 14h.01M15 14h.01" />
          <circle cx="12" cy="4" r="1" />
          <path d="M3 13v3M21 13v3" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
        </svg>
      );
    case 'cam':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <circle cx="12" cy="12.5" r="3.5" />
          <path d="M9 6l1.5-2h3L15 6" />
        </svg>
      );
    case 'wear':
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="3" />
          <path d="M9 6l-.5-3h7L15 6M9 18l-.5 3h7L15 18" />
        </svg>
      );
    case 'edge':
      return (
        <svg {...common}>
          <path d="M4 8h16v8H4z" />
          <path d="M8 8V5M16 8V5M8 19v-3M16 19v-3" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'periph':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="9" rx="1.5" />
          <path d="M7 12h.01M11 12h.01M15 12h.01M7 14.5h10" />
        </svg>
      );
    case 'storage':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="1.5" />
          <path d="M4 9h16M4 13h16M8 17h2M14 17h2" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
          <path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
        </svg>
      );
    case 'flask':
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 19L14 9V3" />
          <path d="M7.5 14h9" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6" />
        </svg>
      );
  }
}
