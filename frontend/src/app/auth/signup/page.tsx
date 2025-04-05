"use client"; // Next.js directive to mark this as a client component

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signup } from "@/lib/api"; // API call for signing up the user

export default function SignUp() {
  const router = useRouter(); // Next.js router for navigation
  const { toast } = useToast(); // Custom toast notification hook

  // State for form input fields
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  // Loading state for the sign-up button
  const [loading, setLoading] = useState(false);

  /**
   * Updates the form data state when user types
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Simple form validation to ensure no empty fields
   */
  const isFormValid = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

  /**
   * Handles form submission
   * - Validates form
   * - Calls the signup API function
   * - Shows toast notifications based on success or failure
   * - Redirects user to email confirmation screen on success
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid)
      return toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });

    setLoading(true);
    try {
      // Call the signup API function
      const response = await signup(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password
      );

      // Show success message
      toast({
        title: "Success",
        description: "Account created! Check your email to confirm.",
      });

      // Redirect to email confirmation screen
      router.push("/auth/confirm-email");
    } catch (error: any) {
      // Display error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      {/* Signup form container */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-4">Sign Up</h2>

        {/* Signup form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
            <p className="text-foreground/70">
            Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>

      </div>
    </div>
  );
}
