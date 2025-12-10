import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_URL: z.string().url().optional(),
  VITE_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_APP_URL: import.meta.env['VITE_APP_URL'],
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
});

/**
 * Get the app base URL for generating links.
 * Falls back to window.location.origin if VITE_APP_URL is not set.
 */
export function getAppUrl(): string {
  return env.VITE_APP_URL ?? window.location.origin;
}
