import type { SVGProps } from 'react';

interface BackGlassIconProps extends SVGProps<SVGSVGElement> {
  highlighted?: boolean;
}

export function BackGlassIcon({ highlighted = false, className, ...props }: BackGlassIconProps) {
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
      {/* Car body outline - rear view */}
      <path
        d="M15 70 L20 50 L30 35 L90 35 L100 50 L105 70 L105 80 L15 80 L15 70Z"
        fill={bodyColor}
        stroke={bodyColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Back glass - highlighted area */}
      <path
        d="M32 35 L37 50 L83 50 L88 35 L32 35Z"
        fill={glassColor}
        stroke={highlighted ? '#2563EB' : '#475569'}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Trunk lid */}
      <path
        d="M37 50 L35 58 L85 58 L83 50"
        fill={accentColor}
        stroke={bodyColor}
        strokeWidth="1"
      />

      {/* Tail lights */}
      <rect x="18" y="55" width="12" height="8" rx="2" fill="#EF4444" stroke={bodyColor} strokeWidth="1" />
      <rect x="90" y="55" width="12" height="8" rx="2" fill="#EF4444" stroke={bodyColor} strokeWidth="1" />

      {/* License plate area */}
      <rect x="45" y="62" width="30" height="10" rx="2" fill={accentColor} stroke={bodyColor} strokeWidth="1" />

      {/* Bumper */}
      <rect x="20" y="72" width="80" height="6" rx="2" fill={accentColor} stroke={bodyColor} strokeWidth="1" />

      {/* Wheels */}
      <ellipse cx="30" cy="82" rx="10" ry="6" fill="#1F2937" />
      <ellipse cx="90" cy="82" rx="10" ry="6" fill="#1F2937" />
      <ellipse cx="30" cy="82" rx="5" ry="3" fill="#6B7280" />
      <ellipse cx="90" cy="82" rx="5" ry="3" fill="#6B7280" />

      {/* Rear wiper */}
      <line
        x1="60"
        y1="38"
        x2="60"
        y2="48"
        stroke={highlighted ? '#1E40AF' : '#374151'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
