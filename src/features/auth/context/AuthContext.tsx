import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { AuthSession, AuthUser } from "@/features/auth/model/auth.schema";
import { logoutSession, refreshSession } from "@/features/auth/api/authApi";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession
} from "@/features/auth/lib/authSessionStorage";
import {
  clearAuthToken,
  isAuthTokenExpired,
  isAuthTokenExpiringSoon,
  setAuthToken
} from "@/shared/lib/authToken";

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperintendente: boolean;
  canManageUsers: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = getStoredAuthSession();
    if (stored) setAuthToken(stored.accessToken);
    return stored;
  });

  const applySession = (nextSession: AuthSession | null) => {
    setSession(nextSession);
    if (!nextSession) {
      clearStoredAuthSession();
      clearAuthToken();
      return;
    }
    setStoredAuthSession(nextSession);
    setAuthToken(nextSession.accessToken);
  };

  const refreshAccessToken = async () => {
    const currentRefreshToken = session?.refreshToken;
    if (!currentRefreshToken) {
      applySession(null);
      return;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await refreshSession({ refreshToken: currentRefreshToken });
        applySession({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken ?? currentRefreshToken,
          user: session.user
        });
      } catch {
        applySession(null);
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  const value = useMemo<AuthContextValue>(() => {
    const login = (nextSession: AuthSession) => {
      applySession(nextSession);
    };

    const logout = () => {
      const currentRefreshToken = session?.refreshToken;
      if (currentRefreshToken) {
        void logoutSession({ refreshToken: currentRefreshToken });
      }
      applySession(null);
    };

    return {
      session,
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      isAdmin: session?.user.role === "ADMIN",
      isSuperintendente: session?.user.role === "SUPERINTENDENTE",
      canManageUsers:
        session?.user.role === "ADMIN" || session?.user.role === "SUPERINTENDENTE",
      login,
      logout
    };
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) return;

    const validateOrRefresh = () => {
      if (isAuthTokenExpired(session.accessToken)) {
        void refreshAccessToken();
        return;
      }
      if (isAuthTokenExpiringSoon(session.accessToken, 5 * 60 * 1000)) {
        void refreshAccessToken();
      }
    };

    validateOrRefresh();
    const intervalId = window.setInterval(validateOrRefresh, 30_000);
    const onVisibilityChange = () => {
      if (!document.hidden) validateOrRefresh();
    };

    const onOnline = () => {
      validateOrRefresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [session?.accessToken, session?.refreshToken]);

  useEffect(() => {
    const onUnauthorized = () => {
      void refreshAccessToken();
    };

    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [session?.refreshToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
