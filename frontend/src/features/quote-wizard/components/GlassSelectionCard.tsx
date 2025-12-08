import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassSelectionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  isSelected: boolean;
  onClick: () => void;
}

export function GlassSelectionCard({
  title,
  description,
  icon,
  isSelected,
  onClick,
}: GlassSelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200',
        'hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          isSelected
            ? 'border-blue-500 bg-blue-500'
            : 'border-gray-300 bg-white'
        )}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Icon */}
      <div className="w-24 h-20 mb-4">
        {icon}
      </div>

      {/* Text */}
      <h3
        className={cn(
          'text-lg font-semibold mb-1 transition-colors',
          isSelected ? 'text-blue-700' : 'text-gray-900'
        )}
      >
        {title}
      </h3>
      <p className="text-sm text-gray-500 text-center">
        {description}
      </p>
    </button>
  );
}
