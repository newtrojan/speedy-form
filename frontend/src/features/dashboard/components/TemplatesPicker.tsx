/**
 * Templates picker component for canned responses
 */

import { useState, useRef, useEffect } from 'react';
import type { Template } from '../types';
import { useTemplates } from '../hooks/useDashboard';
import { getAppUrl } from '@/lib/env';

interface QuoteData {
  customerName?: string | undefined;
  total?: string | undefined;
  quoteId?: string | undefined;
}

interface TemplatesPickerProps {
  onSelect: (content: string) => void;
  quoteData?: QuoteData | undefined;
}

/**
 * Group templates by category (first word of short_code)
 */
function groupTemplates(templates: Template[]): Record<string, Template[]> {
  const groups: Record<string, Template[]> = {};

  for (const template of templates) {
    // Use first word as category, or "General" as fallback
    const category = template.short_code?.split('_')[0] ?? 'general';
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(template);
  }

  return groups;
}

export function TemplatesPicker({ onSelect, quoteData }: TemplatesPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: templatesResponse, isLoading } = useTemplates();

  // Use templates from Chatwoot API - no fallback to hardcoded defaults
  const templates = templatesResponse?.templates ?? [];
  const groupedTemplates = groupTemplates(templates);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Replace template variables with actual data
  const replaceVariables = (content: string): string => {
    if (!quoteData) return content;

    return content
      .replace(/\{\{customer_name\}\}/gi, quoteData.customerName ?? 'Customer')
      .replace(/\{\{quote_total\}\}/gi, quoteData.total ?? '')
      .replace(
        /\{\{quote_link\}\}/gi,
        quoteData.quoteId
          ? `${getAppUrl()}/quotes/${quoteData.quoteId}/preview`
          : ''
      );
  };

  const handleSelectTemplate = (template: Template) => {
    const processedContent = replaceVariables(template.content);
    onSelect(processedContent);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        Templates
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-20">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="p-3 border-b border-gray-100 last:border-0">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {category}
              </p>
              <div className="space-y-1">
                {categoryTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-sm">
                      {template.short_code.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {template.content}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading templates...
            </div>
          )}

          {!isLoading && templates.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              <p className="mb-1">No templates configured</p>
              <p className="text-xs text-gray-400">
                Add canned responses in Chatwoot Settings
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
