/**
 * Chatwoot Live Chat Widget Component
 *
 * Embeds the Chatwoot chat widget on customer-facing pages.
 * Supports user identification for linking conversations to customers.
 */

/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef } from 'react';

interface ChatwootSettings {
  hideMessageBubble?: boolean;
  position?: 'left' | 'right';
  locale?: string;
  type?: 'standard' | 'expanded_bubble';
  launcherTitle?: string;
  showPopoutButton?: boolean;
}

interface ChatwootUser {
  email?: string;
  name?: string;
  identifier?: string;
  phone_number?: string;
  avatar_url?: string;
  // Custom attributes
  [key: string]: string | undefined;
}

interface ChatwootWidgetProps {
  /** Chatwoot website token from inbox settings */
  websiteToken?: string;
  /** Chatwoot instance URL */
  baseUrl?: string;
  /** Widget display settings */
  settings?: ChatwootSettings;
  /** User info for linking conversations */
  user?: ChatwootUser;
}

// Extend Window interface for Chatwoot globals
declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      setUser: (identifier: string, user: Omit<ChatwootUser, 'identifier'>) => void;
      setCustomAttributes: (attributes: Record<string, string>) => void;
      deleteCustomAttribute: (key: string) => void;
      setLocale: (locale: string) => void;
      setLabel: (label: string) => void;
      removeLabel: (label: string) => void;
      reset: () => void;
      toggle: (state?: 'open' | 'close') => void;
      toggleBubbleVisibility: (state: 'show' | 'hide') => void;
      popoutChatWindow: () => void;
    };
  }
}

// Default configuration
const DEFAULT_WEBSITE_TOKEN = 'uN4i1LPg9rzwRrMx3hC7zBip';
const DEFAULT_BASE_URL = 'https://support.dokr.fyi';

export function ChatwootWidget({
  websiteToken = DEFAULT_WEBSITE_TOKEN,
  baseUrl = DEFAULT_BASE_URL,
  settings,
  user,
}: ChatwootWidgetProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent double loading
    if (isLoadedRef.current) {
      // If already loaded and user changed, update user
      if (user?.identifier && window.$chatwoot) {
        const { identifier, ...userData } = user;
        window.$chatwoot.setUser(identifier, userData);
      }
      return;
    }

    // Set Chatwoot settings before loading SDK
    if (settings) {
      window.chatwootSettings = {
        ...settings,
        // Ensure position is set
        position: settings.position ?? 'right',
      };
    }

    // Create and load Chatwoot SDK script
    const script = document.createElement('script');
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoadedRef.current = true;

      // Initialize Chatwoot
      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken,
          baseUrl,
        });

        // Set user when SDK is ready using event listener (more reliable than setTimeout)
        if (user?.identifier) {
          const userIdentifier = user.identifier;
          const handleReady = () => {
            if (window.$chatwoot && userIdentifier) {
              const { identifier: _unusedIdentifier, ...userData } = user;
              void _unusedIdentifier; // Suppress unused variable warning
              window.$chatwoot.setUser(userIdentifier, userData);
            }
            // Remove listener after use
            window.removeEventListener('chatwoot:ready', handleReady);
          };

          // Check if already ready (in case event fired before listener attached)
          if (window.$chatwoot) {
            handleReady();
          } else {
            window.addEventListener('chatwoot:ready', handleReady);
          }
        }
      }
    };

    script.onerror = () => {
      console.error('Failed to load Chatwoot SDK');
    };

    document.body.appendChild(script);
    scriptRef.current = script;

    // Cleanup on unmount
    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
      // Reset Chatwoot state
      if (window.$chatwoot) {
        window.$chatwoot.reset();
      }
      isLoadedRef.current = false;
    };
  }, [websiteToken, baseUrl, settings, user]);

  // This component doesn't render anything - Chatwoot injects its own UI
  return null;
}

/**
 * Hook to control Chatwoot widget programmatically
 */
export function useChatwoot() {
  const open = () => window.$chatwoot?.toggle('open');
  const close = () => window.$chatwoot?.toggle('close');
  const toggle = () => window.$chatwoot?.toggle();
  const show = () => window.$chatwoot?.toggleBubbleVisibility('show');
  const hide = () => window.$chatwoot?.toggleBubbleVisibility('hide');

  const setUser = (identifier: string | undefined, userData: Omit<ChatwootUser, 'identifier'>) => {
    if (identifier) {
      window.$chatwoot?.setUser(identifier, userData);
    }
  };

  const setCustomAttributes = (attributes: Record<string, string>) => {
    window.$chatwoot?.setCustomAttributes(attributes);
  };

  const setLabel = (label: string) => {
    window.$chatwoot?.setLabel(label);
  };

  const reset = () => {
    window.$chatwoot?.reset();
  };

  return {
    open,
    close,
    toggle,
    show,
    hide,
    setUser,
    setCustomAttributes,
    setLabel,
    reset,
    isAvailable: typeof window !== 'undefined' && !!window.$chatwoot,
  };
}
