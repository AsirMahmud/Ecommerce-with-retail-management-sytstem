"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, type LoginCredentials, type UserProfile, type UserRole } from "@/lib/api/auth";
import apiClient, { handleAuthLogout } from "@/lib/api-client";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";
import { hasRole as checkRole, hasRouteAccess } from "@/lib/permissions";

interface JwtPayload {
  user_id?: number;
  username?: string;
  email?: string;
  role?: UserRole;
  is_superuser?: boolean;
  exp?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  canAccess: (pathname: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Professional Loading Screen
function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200/60">
          RS
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-sm font-medium text-slate-500">
            Authenticating...
          </span>
        </div>
        <div className="w-48 h-1 bg-slate-200/60 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp ? decoded.exp < currentTime : true;
    } catch {
      return true;
    }
  };

  const loadUserProfile = useCallback(async (token: string) => {
    try {
      // First populate from token claims for instant responsiveness
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.username) {
        setUser({
          id: decoded.user_id || 0,
          username: decoded.username,
          email: decoded.email || "",
          role: decoded.role || "admin",
          is_superuser: Boolean(decoded.is_superuser),
        });
      }

      // Then fetch full latest profile from backend
      const fullProfile = await authApi.getMe();
      setUser(fullProfile);
    } catch (err) {
      console.warn("Could not load latest profile, using decoded token", err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch (err) {
      console.error("Failed to refresh user profile", err);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get("token");
      const refreshToken = Cookies.get("refreshToken");

      if (!token || isTokenExpired(token)) {
        // If access token is missing/expired, check if refresh token exists
        if (refreshToken) {
          try {
            const refreshRes = await authApi.refreshToken(refreshToken);
            Cookies.set("token", refreshRes.access, {
              expires: 1,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
            });
            setIsAuthenticated(true);
            await loadUserProfile(refreshRes.access);
            setIsLoading(false);
            return;
          } catch {
            // Refresh failed, fall through to logout
          }
        }

        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        Cookies.remove("token");
        Cookies.remove("refreshToken");

        if (!pathname?.startsWith("/login")) {
          router.push(`/login?redirect=${encodeURIComponent(pathname || "/")}`);
        }
        return;
      }

      setIsAuthenticated(true);
      await loadUserProfile(token);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, pathname, loadUserProfile]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      const { access, refresh, user: profile } = response;

      // Set access token in cookie
      Cookies.set("token", access, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      // Set refresh token in cookie
      if (refresh) {
        Cookies.set("refreshToken", refresh, {
          expires: 7,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });
      }

      setIsAuthenticated(true);

      if (profile) {
        setUser(profile);
      } else {
        await loadUserProfile(access);
      }

      // Check for redirect param
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/";
      router.push(redirectTo);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      Cookies.remove("token");
      Cookies.remove("refreshToken");
      delete apiClient.defaults.headers.common["Authorization"];
      setIsAuthenticated(false);
      setUser(null);
      router.push("/login");
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    return checkRole(user?.role, allowedRoles) || Boolean(user?.is_superuser);
  };

  const canAccess = (routePath: string): boolean => {
    return hasRouteAccess(user?.role, routePath) || Boolean(user?.is_superuser);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated,
        isLoading,
        login,
        logout,
        hasRole,
        canAccess,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

