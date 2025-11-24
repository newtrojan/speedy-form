import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { env } from '@/lib/env';
import { setAuthTokenHandlers } from '@/api/client';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'support_agent' | 'customer';
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Connect API client with auth token handlers
  useEffect(() => {
    setAuthTokenHandlers(
      () => accessToken,
      refreshAccessToken
    );
  }, [accessToken]);

  /**
   * Refresh access token using httpOnly refresh_token cookie
   * Returns new access token or null if refresh fails
   */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await axios.post(
        `${env.VITE_API_BASE_URL}/api/v1/auth/refresh/`,
        {},
        {
          withCredentials: true, // Send httpOnly cookie
        }
      );

      const newAccessToken = response.data.access_token;
      setAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      // Refresh token expired or invalid - user needs to login again
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, []);

  /**
   * Login with email and password
   * Stores access token in memory, refresh token auto-set as httpOnly cookie
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${env.VITE_API_BASE_URL}/api/v1/auth/login/`,
        { email, password },
        {
          withCredentials: true, // Receive httpOnly cookie
        }
      );

      const { access_token, user: userData } = response.data;

      setAccessToken(access_token);
      setUser(userData);
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout - clear memory token and httpOnly cookie
   */
  const logout = useCallback(async () => {
    try {
      // Call backend to blacklist refresh token and clear cookie
      await axios.post(
        `${env.VITE_API_BASE_URL}/api/v1/auth/logout/`,
        {},
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          withCredentials: true,
        }
      );
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, [accessToken]);

  /**
   * Auto-refresh access token before expiry (45 min interval for 1hr token)
   */
  useEffect(() => {
    if (!accessToken) return;

    // Refresh every 45 minutes (token expires in 1 hour)
    const refreshInterval = setInterval(() => {
      refreshAccessToken();
    }, 45 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [accessToken, refreshAccessToken]);

  /**
   * Try to restore session on mount using refresh token cookie
   */
  useEffect(() => {
    const restoreSession = async () => {
      setIsLoading(true);
      try {
        // Try to get new access token using refresh token cookie
        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
          // Fetch current user data
          const response = await axios.get(
            `${env.VITE_API_BASE_URL}/api/v1/auth/me/`,
            {
              headers: { Authorization: `Bearer ${newAccessToken}` },
              withCredentials: true,
            }
          );

          setUser(response.data);
        }
      } catch (error) {
        // No valid session - user needs to login
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [refreshAccessToken]);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
