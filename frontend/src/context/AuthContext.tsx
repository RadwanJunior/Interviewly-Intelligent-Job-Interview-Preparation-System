// "use client";

// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   ReactNode,
//   useMemo,
// } from "react";
// import { supabase } from "@/lib/supabase";

// interface AuthContextType {
//   session: any | null;
//   user: any | null;
//   loading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [session, setSession] = useState<any | null>(null);
//   const [user, setUser] = useState<any | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchSession = async () => {
//       setLoading(true);
//       const { data, error } = await supabase.auth.getSession();
//       if (error) console.error("Error fetching session:", error);

//       // Only update state if session has changed
//       setSession((prevSession: { access_token: string | undefined }) =>
//         prevSession?.access_token !== data.session?.access_token
//           ? data.session
//           : prevSession
//       );
//       setUser((prevUser: { id: string | undefined }) =>
//         prevUser?.id !== data.session?.user?.id ? data.session?.user : prevUser
//       );
//       setLoading(false);
//     };

//     fetchSession();

//     const { data: authListener } = supabase.auth.onAuthStateChange(
//       (_event, newSession) => {
//         setSession((prevSession: { access_token: string | undefined }) =>
//           prevSession?.access_token !== newSession?.access_token
//             ? newSession
//             : prevSession
//         );
//         setUser((prevUser: { id: string | undefined }) =>
//           prevUser?.id !== newSession?.user?.id ? newSession?.user : prevUser
//         );
//       }
//     );

//     return () => {
//       authListener.subscription?.unsubscribe();
//     };
//   }, []);

//   // Memoize the context value to avoid unnecessary re-renders
//   const contextValue = useMemo(
//     () => ({ session, user, loading }),
//     [session, user, loading]
//   );

//   console.log("AuthContext re-rendered:", { session, user, loading });

//   return (
//     <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

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
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const response = await refreshToken(); // Attempt to refresh session
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

  const loginUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
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
