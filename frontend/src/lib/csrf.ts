/**
 * CSRF Token Utilities
 *
 * Django sets csrftoken cookie (non-httpOnly) that frontend can read.
 * Frontend must include this token in X-CSRFToken header for mutation requests.
 */

/**
 * Extract CSRF token from cookies
 * Django sets cookie named "csrftoken"
 */
export function getCSRFToken(): string | null {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(`${name}=`)) {
      return trimmedCookie.substring(name.length + 1);
    }
  }

  return null;
}

/**
 * Check if HTTP method requires CSRF protection
 * Django requires CSRF token for unsafe methods
 */
export function requiresCSRFToken(method: string): boolean {
  const safeMethod = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  return !safeMethod.includes(method.toUpperCase());
}
