"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { signup } from "@/lib/api"; // Import the API.signup function

export default function SignUp() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

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
      await signup(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password
      );
      toast({
        title: "Success",
        description: "Account created! Check your email to confirm.",
      });
      router.push("/auth/confirm-email");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Signup failed, please try again.";
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
    // <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
    //   <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
    //     <h2 className="text-2xl font-semibold text-center mb-4">Sign Up</h2>
    
        <div className="container mx-auto px-4 py-32">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">Create an Account</h1>
            <p className="text-foreground/70 mt-2">Sign up to start your interview preparation</p>
          </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
