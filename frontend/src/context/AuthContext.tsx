"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { login, logout, refreshToken } from "@/lib/api";

interface AuthContextType {
  user: { id: string; email: string } | null;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<{ id: string; email: string } | null>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth...");
        setLoading(true);
        const response = await refreshToken();
        console.log("✅ Auth refresh successful:", response);

        if ((response as { user?: { id: string; email: string } }).user) {
          setUser((response as { user: { id: string; email: string } }).user);
        } else {
          console.log("⚠️ No user in response");
          setUser(null);
        }
      } catch (error: unknown) {
        console.error("❌ Error refreshing token:", error);
        setUser(null);

        // Only redirect if we get a 401 and we're on a protected page
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          (error as { response?: { status?: number } }).response?.status === 401
        ) {
          const publicPaths = ["/", "/auth/login", "/auth/signup"];
          const currentPath = window.location.pathname;

          if (!publicPaths.includes(currentPath)) {
            console.log("🚪 Redirecting to login from:", currentPath);
            // Don't redirect immediately - let the component handle it
          }
        }
      } finally {
        console.log("✅ Auth initialization complete");
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await login(email, password);
      const typedResponse = response as { user?: { id: string; email: string } };
      if (typedResponse.user) {
        setUser(typedResponse.user);
        return typedResponse.user;
      }
      return null;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      await logout();
      setUser(null);
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      window.location.href = "/auth/login";
    }
  };

  const contextValue = useMemo(
    () => ({ user, loading, loginUser, logoutUser }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
