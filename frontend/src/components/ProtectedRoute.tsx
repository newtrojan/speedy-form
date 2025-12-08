import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional required role. If not specified, any authenticated user can access.
   * For V1, we just check authentication. Role-based access is deferred to V2.
   */
  requiredRole?: 'admin' | 'support_agent' | 'customer';
}

/**
 * Protects routes that require authentication.
 * Redirects to /login if user is not authenticated.
 * Shows loading spinner during session restoration.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required (V1: simple check, V2: more sophisticated)
  if (requiredRole && user?.role !== requiredRole) {
    // For V1, support_agent and admin can access dashboard
    // Admin has all permissions, support_agent has dashboard access
    const hasAccess =
      user?.role === 'admin' ||
      (requiredRole === 'support_agent' && user?.role === 'support_agent');

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
