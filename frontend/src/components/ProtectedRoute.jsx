"use client";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.push("/"); // Redirect to homepage if not logged in
    }
  }, [session, loading, router]);

  if (loading) return <p>Loading...</p>; // Or a better loading UI

  return <>{session ? children : null}</>;
}
