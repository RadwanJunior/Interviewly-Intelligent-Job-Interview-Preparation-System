"use client";
import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import Link from "next/link";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // This would be replaced with actual authentication check
  const [isLoggedIn, setIsLoggedIn] = useState(false); // For demo purposes

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md py-4 shadow-sm"
          : "bg-transparent py-6"
      }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-heading font-bold text-primary">
            Interviewly
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-foreground/80 hover:text-primary transition-colors">
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-foreground/80 hover:text-primary transition-colors">
              How it Works
            </Link>
            {isLoggedIn ? (
              <Link
                href="/profile"
                className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            ) : (
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
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg animate-fade-in">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              <Link
                href="#features"
                className="text-foreground/80 hover:text-primary transition-colors">
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-foreground/80 hover:text-primary transition-colors">
                How it Works
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/profile"
                  className="text-foreground/80 hover:text-primary transition-colors flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              ) : (
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
};

export default Navbar;
