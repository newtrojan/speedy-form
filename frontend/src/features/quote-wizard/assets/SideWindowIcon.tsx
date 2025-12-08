import type { SVGProps } from 'react';

interface SideWindowIconProps extends SVGProps<SVGSVGElement> {
  highlighted?: boolean;
}

export function SideWindowIcon({ highlighted = false, className, ...props }: SideWindowIconProps) {
  const glassColor = highlighted ? '#3B82F6' : '#94A3B8';
  const bodyColor = highlighted ? '#1E40AF' : '#64748B';
  const accentColor = highlighted ? '#60A5FA' : '#CBD5E1';

  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Car body outline - side view */}
      <path
        d="M10 65 L15 55 L30 40 L50 35 L90 35 L100 45 L110 55 L110 70 L10 70 L10 65Z"
        fill={bodyColor}
        stroke={bodyColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Roof line */}
      <path
        d="M30 40 L50 35 L90 35 L85 40 L30 40Z"
        fill={accentColor}
        stroke={bodyColor}
        strokeWidth="1"
      />

      {/* Front windshield (not highlighted) */}
      <path
        d="M30 40 L42 40 L38 52 L20 52 L30 40Z"
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Side windows - highlighted area */}
      <path
        d="M44 40 L83 40 L83 52 L40 52 L44 40Z"
        fill={glassColor}
        stroke={highlighted ? '#2563EB' : '#475569'}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Window divider (B-pillar) */}
      <line
        x1="60"
        y1="40"
        x2="60"
        y2="52"
        stroke={bodyColor}
        strokeWidth="3"
      />

      {/* Back glass (not highlighted) */}
      <path
        d="M85 40 L100 45 L100 52 L85 52 L85 40Z"
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Door lines */}
      <line x1="40" y1="52" x2="40" y2="68" stroke={accentColor} strokeWidth="1" />
      <line x1="75" y1="52" x2="75" y2="68" stroke={accentColor} strokeWidth="1" />

      {/* Door handles */}
      <rect x="48" y="58" width="8" height="3" rx="1" fill={accentColor} />
      <rect x="83" y="58" width="8" height="3" rx="1" fill={accentColor} />

      {/* Front wheel */}
      <circle cx="30" cy="72" r="12" fill="#1F2937" />
      <circle cx="30" cy="72" r="6" fill="#6B7280" />
      <circle cx="30" cy="72" r="3" fill="#9CA3AF" />

      {/* Rear wheel */}
      <circle cx="90" cy="72" r="12" fill="#1F2937" />
      <circle cx="90" cy="72" r="6" fill="#6B7280" />
      <circle cx="90" cy="72" r="3" fill="#9CA3AF" />

      {/* Headlight */}
      <path
        d="M12 58 L20 55 L20 62 L12 62 Z"
        fill="#FEF3C7"
        stroke={bodyColor}
        strokeWidth="1"
      />

      {/* Taillight */}
      <path
        d="M108 55 L108 62 L102 62 L102 58 Z"
        fill="#EF4444"
        stroke={bodyColor}
        strokeWidth="1"
      />

      {/* Side mirror */}
      <ellipse cx="22" cy="48" rx="4" ry="3" fill={bodyColor} stroke={accentColor} strokeWidth="1" />
    </svg>
  );
}
