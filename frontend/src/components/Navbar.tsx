/**
 * Navbar.tsx - Responsive navigation bar component for Interviewly.
 * Provides navigation links, user authentication actions, and adapts to mobile/desktop layouts.
 * Includes scroll detection for dynamic styling and smooth section navigation.
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Menu, X, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

/**
 * Custom hook to track whether the user has scrolled down the page.
 * Updates state to reflect scroll position for dynamic navbar styling.
 * @returns {boolean} True if the page is scrolled beyond 10px, false otherwise.
 */
const useScrollHandler = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return isScrolled;
};

/**
 * Navbar component for the application.
 * Renders navigation links, user profile/login actions, and adapts to mobile/desktop.
 * Uses scroll position to apply dynamic styles and supports smooth section navigation.
 *
 * @returns {JSX.Element} The rendered navigation bar.
 */
const Navbar = React.memo(() => {
  const isScrolled = useScrollHandler();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const handleScrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsMobileMenuOpen(false); // Close mobile menu after clicking
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/80 backdrop-blur-md py-4 shadow-sm" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-heading font-bold text-primary">
          Interviewly
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {["features", "how-it-works", "pricing"].map((section) => (
            <button
              key={section}
              onClick={() => handleScrollToSection(section)}
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              {section.replace("-", " ")}
            </button>
          ))}
          {user ? (
            <Link
              href="/profile"
              className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
            >
              Log in
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setIsMobileMenuOpen((prev) => !prev)}>
          {isMobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {["features", "how-it-works", "pricing"].map((section) => (
              <button
                key={section}
                onClick={() => handleScrollToSection(section)}
                className="text-foreground/80 hover:text-primary transition-colors"
              >
                {section.replace("-", " ")}
              </button>
            ))}
            {user ? (
              <Link
                href="/profile"
                className="text-foreground/80 hover:text-primary transition-colors flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;

