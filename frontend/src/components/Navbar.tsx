"use client"; // Indicates that this is a Client Component in Next.js

import React from "react"; 
import { useState, useEffect } from "react"; 
import { Menu, X, User } from "lucide-react"; 
import Link from "next/link"; 
import { useAuth } from "@/context/AuthContext"; 

// Memoized Navbar component to prevent unnecessary re-renders
const Navbar = React.memo(() => {
  const [isScrolled, setIsScrolled] = useState(false); // State to track if the page is scrolled
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State to manage mobile menu visibility
  const { user } = useAuth(); // Access user data from the Auth context

  console.log("Navbar re-rendered"); // Log to track re-renders (for debugging)

  // Effect to handle scroll events and update the `isScrolled` state
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10); // Set `isScrolled` to true if the page is scrolled more than 10px
    };
    window.addEventListener("scroll", handleScroll); // Add scroll event listener
    return () => window.removeEventListener("scroll", handleScroll); // Cleanup event listener on unmount
  }, []);

  return isScrolled;
};

// Navbar component
// This component contains the navigation bar for the application
const Navbar = React.memo(() => {
  const isScrolled = useScrollHandler();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const handleScrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsMobileMenuOpen(false); // Close mobile menu after clicking
  }, []);

  return (
    // Navbar container with dynamic styling based on scroll state
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md py-4 shadow-sm" 
          : "bg-transparent py-6" 
      }`}>
      {/* Container for navbar content */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-heading font-bold text-primary">
            Interviewly
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Features link */}
            <Link
              href="#features"
              className="text-foreground/80 hover:text-primary transition-colors">
              Features
            </Link>
            {/* How It Works link */}
            <Link
              href="#how-it-works"
              className="text-foreground/80 hover:text-primary transition-colors">
              How it Works
            </Link>
            {/* Conditional rendering for Profile or Login link */}
            {user ? (
              // Profile link (visible when user is logged in)
              <Link
                href="/profile"
                className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            ) : (
              // Login link (visible when user is not logged in)
              <Link
                href="/auth/login"
                className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors">
                Log in
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? (
              // Close icon (visible when mobile menu is open)
              <X className="h-6 w-6 text-foreground" />
            ) : (
              // Menu icon (visible when mobile menu is closed)
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu (visible when `isMobileMenuOpen` is true) */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg animate-fade-in">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              {/* Features link */}
              <Link
                href="#features"
                className="text-foreground/80 hover:text-primary transition-colors">
                Features
              </Link>
              {/* How It Works link */}
              <Link
                href="#how-it-works"
                className="text-foreground/80 hover:text-primary transition-colors">
                How it Works
              </Link>
              {/* Conditional rendering for Profile or Login link */}
              {user ? (
                // Profile link (visible when user is logged in)
                <Link
                  href="/profile"
                  className="text-foreground/80 hover:text-primary transition-colors flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              ) : (
                // Login link (visible when user is not logged in)
                <Link
                  href="/login"
                  className="text-foreground/80 hover:text-primary transition-colors">
                  Log in
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar; 