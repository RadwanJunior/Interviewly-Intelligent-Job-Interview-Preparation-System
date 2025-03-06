"use client";
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const LogIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    // This would be replaced with actual authentication logic
    setTimeout(() => {
      toast({
        title: "Login successful",
        description: "You have been logged in successfully.",
      });
      setIsLoading(false);
    }, 1500);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/10 to-white">
      <Head>
        <title>Log in - Interviewly</title>
        <meta
          name="description"
          content="Login to your Interviewly account to continue your interview preparation."
        />
      </Head>

      <Navbar />

      <div className="container mx-auto px-4 py-32">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 animate-fade-up">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="text-foreground/70 mt-2">
              Log in to continue your interview preparation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-foreground/70">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
export default LogIn;
