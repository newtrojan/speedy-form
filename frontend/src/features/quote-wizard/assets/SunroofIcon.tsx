import type { SVGProps } from 'react';

interface SunroofIconProps extends SVGProps<SVGSVGElement> {
  highlighted?: boolean;
}

export function SunroofIcon({ highlighted = false, className, ...props }: SunroofIconProps) {
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
      {/* Car body outline - top view */}
      <path
        d="M30 15 L90 15 L100 30 L100 70 L90 85 L30 85 L20 70 L20 30 L30 15Z"
        fill={bodyColor}
        stroke={bodyColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Hood area */}
      <path
        d="M35 15 L85 15 L90 25 L30 25 L35 15Z"
        fill={accentColor}
        stroke={bodyColor}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Windshield (top view) */}
      <path
        d="M30 25 L90 25 L85 32 L35 32 L30 25Z"
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Roof with sunroof cutout */}
      <path
        d="M35 32 L85 32 L85 58 L35 58 L35 32Z"
        fill={accentColor}
        stroke={bodyColor}
        strokeWidth="1"
      />

      {/* Sunroof - highlighted area */}
      <rect
        x="42"
        y="36"
        width="36"
        height="18"
        rx="3"
        fill={glassColor}
        stroke={highlighted ? '#2563EB' : '#475569'}
        strokeWidth="2"
      />

      {/* Sunroof details */}
      {highlighted && (
        <>
          <line x1="60" y1="38" x2="60" y2="52" stroke="#60A5FA" strokeWidth="1" opacity="0.5" />
          <line x1="44" y1="45" x2="76" y2="45" stroke="#60A5FA" strokeWidth="1" opacity="0.5" />
        </>
      )}

      {/* Back glass (top view) */}
      <path
        d="M35 58 L85 58 L90 65 L30 65 L35 58Z"
        fill="#94A3B8"
        stroke="#475569"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Trunk area */}
      <path
        d="M30 65 L90 65 L85 80 L35 80 L30 65Z"
        fill={accentColor}
        stroke={bodyColor}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Side mirrors */}
      <ellipse cx="18" cy="30" rx="5" ry="8" fill={bodyColor} />
      <ellipse cx="102" cy="30" rx="5" ry="8" fill={bodyColor} />

      {/* Wheels (visible from top) */}
      <rect x="13" y="38" width="8" height="20" rx="3" fill="#1F2937" />
      <rect x="99" y="38" width="8" height="20" rx="3" fill="#1F2937" />
      <rect x="13" y="55" width="8" height="20" rx="3" fill="#1F2937" />
      <rect x="99" y="55" width="8" height="20" rx="3" fill="#1F2937" />

      {/* Headlights indicator */}
      <circle cx="40" cy="18" r="3" fill="#FEF3C7" />
      <circle cx="80" cy="18" r="3" fill="#FEF3C7" />

      {/* Tail lights indicator */}
      <circle cx="40" cy="82" r="3" fill="#EF4444" />
      <circle cx="80" cy="82" r="3" fill="#EF4444" />
    </svg>
  );
}
