"use client";

/**
 * AuthContext.tsx - React context and provider for authentication state
 * Provides authentication state, login, and logout methods to the app via context.
 * Includes a custom hook for easy access to auth state in components.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { login, logout, refreshToken } from "@/lib/api";
import { useRouter } from "next/navigation";

/**
 * AuthContextType defines the shape of the authentication context value.
 */
interface AuthContextType {
  user: { id: string; email: string } | null;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

/**
 * The authentication context instance (do not use directly, use useAuth).
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider wraps the app and provides authentication state and actions.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await refreshToken();
        if (response.user) {
          setUser(response.user);
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      await logout(); // call API to clear cookies
    } catch (error) {
      // Even if the API call fails, force client logout
      console.error("Logout error:", error);
    } finally {
      setUser(null); // make sure context is cleared
      router.push("/auth/login"); // redirect to login instead of home (optional)
    }
  };


  const contextValue = useMemo(
    () => ({ user, loading, loginUser, logoutUser }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth is a custom hook to access authentication state and actions.
 * Throws an error if used outside of AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
