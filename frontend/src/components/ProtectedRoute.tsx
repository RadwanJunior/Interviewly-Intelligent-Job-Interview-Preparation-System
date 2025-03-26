"use client"; // Indicates that this is a Client Component in Next.js

import { useAuth } from "../context/AuthContext"; 
import { useEffect } from "react"; 
import { useRouter } from "next/navigation"; 

// ProtectedRoute component to restrict access to authenticated users only
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth(); 
  const router = useRouter(); 

  // Effect to handle redirection if the user is not logged in
  useEffect(() => {
    if (!loading && !session) {
      router.push("/auth/login"); // Redirect to the login page if there is no session and loading is complete
    }
  }, [session, loading, router]); // Run effect when session, loading, or router changes

  // Show a loading spinner while authentication state is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" /> 
      </div>
    );
  }

  // Render children only if the user is authenticated
  return <>{session ? children : null}</>;
}