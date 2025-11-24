# Frontend Security Best Practices

## TypeScript Security Features

### Current Configuration (tsconfig.json)

Our TypeScript configuration includes multiple layers of security and safety checks:

#### Core Safety Flags

1. **`"strict": true`** - Enables all strict type-checking options:
   - `strictNullChecks` - Prevents null/undefined access errors
   - `strictFunctionTypes` - Ensures function parameter type safety
   - `strictBindCallApply` - Type-checks bind, call, and apply
   - `strictPropertyInitialization` - Ensures class properties are initialized
   - `noImplicitThis` - Prevents implicit `any` in `this` expressions
   - `alwaysStrict` - Ensures all files are parsed in ECMAScript strict mode

2. **`"noUncheckedIndexedAccess": true`** - Critical for array/object safety
   - Makes `array[index]` return `T | undefined`
   - Prevents runtime errors from undefined array access
   - Forces explicit null checks before accessing indexed values

3. **`"noImplicitOverride": true`** - Prevents accidental method overrides
   - Requires explicit `override` keyword in derived classes
   - Catches bugs where parent method signature changes

4. **`"noImplicitReturns": true`** - Ensures all code paths return a value
   - Prevents functions from implicitly returning `undefined`
   - Catches missing return statements in conditional branches

5. **`"noPropertyAccessFromIndexSignature": true`** - Forces bracket notation
   - Makes dynamic property access more explicit
   - Helps identify potential typos in property names

6. **`"forceConsistentCasingInFileNames": true`** - Cross-platform safety
   - Ensures imports match exact file name casing
   - Prevents bugs when deploying from macOS to Linux

7. **`"noUnusedLocals": true`** / **`"noUnusedParameters": true`**
   - Prevents dead code and potential bugs
   - Keeps codebase clean and maintainable

8. **`"noFallthroughCasesInSwitch": true`**
   - Prevents accidental fallthrough in switch statements
   - Requires explicit `break` or `return`

9. **`"verbatimModuleSyntax": true`** - ESM best practice
   - Ensures imports are preserved exactly for tree-shaking
   - Prevents accidental side-effects from imports

#### React 19 Specific

- **`"jsx": "react-jsx"`** - Uses React 19's automatic JSX runtime
- **`"jsxImportSource": "react"`** - Ensures React 19 types are used

## Input Validation & Sanitization

### Zod Schema Validation

All user inputs MUST be validated using Zod schemas before processing:

```typescript
import { z } from 'zod';

// Example: VIN validation
const vinSchema = z.string()
  .length(17, 'VIN must be exactly 17 characters')
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format');

// Example: Email validation
const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long');

// Example: Postal code validation
const postalCodeSchema = z.string()
  .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code');
```

### React Hook Form Integration

Use Zod with React Hook Form for type-safe form validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  vin: vinSchema,
  email: emailSchema,
  postalCode: postalCodeSchema,
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(formSchema),
});
```

## XSS Prevention

### React's Built-in Protection

React automatically escapes values embedded in JSX:

```typescript
// ✅ Safe - React escapes automatically
<div>{userInput}</div>

// ❌ DANGEROUS - Bypasses React's escaping
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### Rules

1. **NEVER use `dangerouslySetInnerHTML`** unless absolutely necessary
2. If HTML rendering is required, use a sanitization library like `DOMPurify`:

```typescript
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(userHTML);
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

## Authentication & Authorization

### Token Storage

✅ **IMPLEMENTED - Production Ready**

Our authentication system uses industry-standard security practices:

- **Access Token**: Stored in memory (React Context) - short-lived (1 hour)
- **Refresh Token**: Stored in httpOnly cookie - long-lived (7 days), XSS protected
- **CSRF Token**: Stored in non-httpOnly cookie - readable for request headers

**Implementation:**

```typescript
// ✅ Access token in memory (AuthContext)
const { accessToken, login, logout } = useAuth();

// ✅ Refresh token auto-managed via httpOnly cookie
// Backend sets: httpOnly=True, secure=True, samesite='Lax'

// ✅ Auto token refresh before expiry
// AuthContext refreshes every 45 minutes (1hr token lifetime)
```

**Files:**

- `/src/context/AuthContext.tsx` - Memory-based auth state
- `/src/api/client.ts` - Auto token injection & refresh
- `/src/lib/csrf.ts` - CSRF token utilities

### CSRF Protection

✅ **IMPLEMENTED - Production Ready**

All state-changing requests (POST, PUT, PATCH, DELETE) automatically include CSRF token:

- **Django Backend**: Sets `csrftoken` cookie (non-httpOnly, so frontend can read)
- **Frontend**: Auto-reads cookie and adds `X-CSRFToken` header
- **Protection**: SameSite=Lax cookies prevent cross-site attacks

**Implementation:**

```typescript
// ✅ Auto CSRF token injection (in api/client.ts)
if (requiresCSRFToken(config.method)) {
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
}
```

## API Security

### Axios Interceptors

✅ **IMPLEMENTED - Production Ready**

Our API client includes comprehensive security measures:

**Features:**

1. **Automatic Token Injection**: Access token from memory added to Authorization header
2. **CSRF Token Injection**: Auto-added for POST/PUT/PATCH/DELETE requests
3. **Auto Token Refresh**: Seamlessly refreshes expired access tokens using httpOnly refresh_token
4. **Credentials Support**: `withCredentials: true` for cookie-based auth
5. **Request Queueing**: Multiple concurrent 401s handled gracefully

**Implementation:**

```typescript
// ✅ Request Interceptor: Auth + CSRF tokens
apiClient.interceptors.request.use((config) => {
  // Add JWT access token from memory
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for mutations
  if (requiresCSRFToken(config.method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }

  return config;
});

// ✅ Response Interceptor: Auto token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Attempt to refresh access token using httpOnly cookie
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } else {
        // Refresh failed - redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Rate Limiting

- Backend enforces rate limits (100/day anon, 1000/day auth)
- Frontend should implement exponential backoff for retries

## Content Security Policy (CSP)

**TO BE IMPLEMENTED**: Add CSP headers in production:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' http://localhost:8000;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

## Environment Variables

### Type-Safe Environment Variables

We use Zod to validate environment variables at build time:

```typescript
// src/lib/env.ts
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']),
});

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
});
```

### Rules

1. **NEVER** commit `.env` files
2. **ALWAYS** use `.env.example` as template
3. **NEVER** include secrets in frontend env vars (public to users)
4. Prefix all Vite env vars with `VITE_`

## Dependency Security

### Regular Updates

Run security audits regularly:

```bash
npm audit
npm audit fix
```

### Known Vulnerabilities

Check for vulnerabilities before adding dependencies:

```bash
npm install <package> --dry-run
npm audit
```

## ESLint Security Plugin

We use `eslint-plugin-security` to catch common security issues:

- Detects unsafe RegEx patterns
- Warns about `eval()` usage
- Identifies potential command injection
- Catches insecure random number generation

## Code Review Checklist

Before merging code, verify:

- [ ] All user inputs validated with Zod
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] No sensitive data in localStorage
- [ ] No hardcoded secrets or API keys
- [ ] `npm run validate` passes (type-check + lint + format)
- [ ] ESLint security warnings addressed

## Additional Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/learn/react-compiler#security)
- [Vite Security](https://vitejs.dev/guide/env-and-mode.html#security-notes)
- [TypeScript Security](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

---

**Last Updated**: 2025-01-22
**Status**: Active Development
