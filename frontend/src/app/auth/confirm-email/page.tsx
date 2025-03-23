"use client"; // Directive for Next.js to treat this as a client-side component

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { refreshToken } from "@/lib/api";

export default function ConfirmEmail() {
  const router = useRouter(); // Next.js router for navigation
  const { toast } = useToast(); // Custom hook to display toast notifications
  const [checking, setChecking] = useState(false); // State to manage the loading state when checking confirmation

  /**
   * Function to check if the user's email has been confirmed.
   * Attempts to refresh the token to see if a user session is available.
   * If confirmed, it shows a success toast and redirects to the dashboard.
   */
  const checkEmailConfirmation = async () => {
    setChecking(true); // Start the loading state
    try {
      const session = await refreshToken(); // Attempt to refresh session token
      if (session?.user) {
        // If user is authenticated, show a success message
        toast({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
        router.push("/dashboard"); // Redirect to the dashboard
      }
    } catch (error) {
      // Handle the case where the email is not yet confirmed
      // Optionally, you could show a toast or message here
    } finally {
      setChecking(false); // Reset the loading state
    }
  };

  /**
   * useEffect hook sets up polling every 10 seconds to check if the email is confirmed.
   * The interval is cleared when the component unmounts.
   */
  useEffect(() => {
    const interval = setInterval(checkEmailConfirmation, 10000); // Poll every 10 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Render the email confirmation UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold mb-4">Confirm Your Email</h2>
        <p className="mb-6">
          An email has been sent to your address. Please click the confirmation
          link to activate your account.
        </p>
        {/* Button allows user to manually trigger email confirmation check */}
        <Button onClick={checkEmailConfirmation} disabled={checking}>
          {checking ? "Checking..." : "I have confirmed my email"}
        </Button>
      </div>
    </div>
  );
}
