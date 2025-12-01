"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { refreshToken } from "@/lib/api";

export default function ConfirmEmail() {
  const router = useRouter();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  // Optionally, poll to see if the email is confirmed
  const checkEmailConfirmation = useCallback(async () => {
    setChecking(true);
    try {
      const session = await refreshToken();
      if (session?.user) {
        toast({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking email confirmation:", error);
    } finally {
      setChecking(false);
    }
  }, [router, toast]);

  // Optionally, poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(checkEmailConfirmation, 10000);
    return () => clearInterval(interval);
  }, [checkEmailConfirmation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold mb-4">Confirm Your Email</h2>
        <p className="mb-6">
          An email has been sent to your address. Please click the confirmation
          link to activate your account.
        </p>
        <Button onClick={checkEmailConfirmation} disabled={checking}>
          {checking ? "Checking..." : "I have confirmed my email"}
        </Button>
      </div>
    </div>
  );
}
