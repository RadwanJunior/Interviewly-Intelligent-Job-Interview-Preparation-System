"use client"; // Indicates that this is a Client Component in Next.js

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react"; 
import { login, logout, refreshToken } from "@/lib/api"; 

// Define the shape of the AuthContext
interface AuthContextType {
  user: any | null; 
  loading: boolean; 
  loginUser: (email: string, password: string) => Promise<void>; 
  logoutUser: () => Promise<void>; 
}

// Create the AuthContext with an initial value of `undefined`
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component to wrap the application and provide authentication state
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null); 
  const [loading, setLoading] = useState(true); 

  // Effect to initialize authentication state (e.g., check for an existing session)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const response = await refreshToken(); 
        if (response.user) {
          setUser(response.user); 
        }
      } catch (error) {
        console.error("Error refreshing token:", error); 
        setUser(null); 
      } finally {
        setLoading(false); 
      }
    };

    initializeAuth(); 
  }, []); 

  // Function to log in a user
  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await login(email, password); // Call the login API
      if (response.user) {
        setUser(response.user); 
      }
    } catch (error) {
      console.error("Login error:", error); 
    } finally {
      setLoading(false); 
    }
  };

  // Function to log out a user
  const logoutUser = async () => {
    try {
      await logout(); // Call the logout API
      setUser(null); 
    } catch (error) {
      console.error("Logout error:", error); // Log errors during logout
    }
  };

  // Memoize the context value to optimize performance
  const contextValue = useMemo(
    () => ({ user, loading, loginUser, logoutUser }),
    [user, loading]
  );

  // Provide the authentication context to all child components
  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to access the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext); // Retrieve the context value
  if (!context) {
    // Throw an error if the hook is used outside of an AuthProvider
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context; // Return the authentication context
};