"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, type LoginCredentials } from "@/lib/api/auth";
import axios from "axios";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
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
            Loading...
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp ? decoded.exp < currentTime : true;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const token = Cookies.get("token");
      if (!token || isTokenExpired(token)) {
        setIsAuthenticated(false);
        setIsLoading(false);
        Cookies.remove("token");
        delete axios.defaults.headers.common["Authorization"];
        // Redirect to login if not on login page
        if (!pathname?.startsWith("/login")) {
          router.push("/login");
        }
        return;
      }

      // Set token in axios headers
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);

      // If on login page, redirect to dashboard

      setIsLoading(false);
    };

    checkAuth();
  }, [router, pathname]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      const { access } = response;

      // Set token with expiration
      Cookies.set("token", access, {
        expires: 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      // Set token in axios headers
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      setIsAuthenticated(true);

      // Check for redirect param from middleware
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/";
      router.push(redirectTo);
    } catch (error) {
      throw new Error("Invalid credentials");
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      Cookies.remove("token");
      delete axios.defaults.headers.common["Authorization"];
      setIsAuthenticated(false);
      router.push("/login");
    }
  };

  // Show professional loading state while checking authentication
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
