/**
 * ProtectedRoute.tsx - Higher-order React component for route protection.
 * Redirects unauthenticated users to the login page and displays a loading state while authentication is in progress.
 * Wraps child components that require authentication.
 */
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

/**
 * Protects a route by requiring user authentication.
 * If the user is unauthenticated, redirects to the login page.
 * Shows a loading indicator while authentication status is being determined.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render if authenticated.
 * @returns {JSX.Element | null} The protected content or a loading indicator.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return <>{session ? children : null}</>;
};

export default ProtectedRoute;