import type { SVGProps } from 'react';

interface WindshieldIconProps extends SVGProps<SVGSVGElement> {
  highlighted?: boolean;
}

export function WindshieldIcon({ highlighted = false, className, ...props }: WindshieldIconProps) {
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
      {/* Car body outline - front view */}
      <path
        d="M15 70 L20 50 L30 35 L90 35 L100 50 L105 70 L105 80 L15 80 L15 70Z"
        fill={bodyColor}
        stroke={bodyColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Windshield - highlighted area */}
      <path
        d="M30 35 L35 48 L85 48 L90 35 L30 35Z"
        fill={glassColor}
        stroke={highlighted ? '#2563EB' : '#475569'}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Hood */}
      <path
        d="M35 48 L30 55 L90 55 L85 48"
        fill={accentColor}
        stroke={bodyColor}
        strokeWidth="1"
      />

      {/* Headlights */}
      <ellipse cx="25" cy="60" rx="6" ry="4" fill="#FEF3C7" stroke={bodyColor} strokeWidth="1" />
      <ellipse cx="95" cy="60" rx="6" ry="4" fill="#FEF3C7" stroke={bodyColor} strokeWidth="1" />

      {/* Grille */}
      <rect x="45" y="58" width="30" height="8" rx="2" fill={accentColor} stroke={bodyColor} strokeWidth="1" />
      <line x1="50" y1="58" x2="50" y2="66" stroke={bodyColor} strokeWidth="1" />
      <line x1="55" y1="58" x2="55" y2="66" stroke={bodyColor} strokeWidth="1" />
      <line x1="60" y1="58" x2="60" y2="66" stroke={bodyColor} strokeWidth="1" />
      <line x1="65" y1="58" x2="65" y2="66" stroke={bodyColor} strokeWidth="1" />
      <line x1="70" y1="58" x2="70" y2="66" stroke={bodyColor} strokeWidth="1" />

      {/* Wheels */}
      <ellipse cx="30" cy="82" rx="10" ry="6" fill="#1F2937" />
      <ellipse cx="90" cy="82" rx="10" ry="6" fill="#1F2937" />
      <ellipse cx="30" cy="82" rx="5" ry="3" fill="#6B7280" />
      <ellipse cx="90" cy="82" rx="5" ry="3" fill="#6B7280" />

      {/* Rearview mirrors */}
      <rect x="12" y="42" width="8" height="4" rx="1" fill={bodyColor} />
      <rect x="100" y="42" width="8" height="4" rx="1" fill={bodyColor} />
    </svg>
  );
}
