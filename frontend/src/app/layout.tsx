import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WorkflowProvider } from "@/context/workflow";

// Configure Geist Sans font with custom variable and subset
const geistSans = Geist({
  variable: "--font-geist-sans", 
  subsets: ["latin"], 
});

// Configure Geist Mono font with custom variable and subset
const geistMono = Geist_Mono({
  variable: "--font-geist-mono", 
  subsets: ["latin"], 
});

// Define metadata for the page
export const metadata: Metadata = {
  title: "Interviewly",
  description: "AI-Powered Interview Preparation",
};

// Define the RootLayout component
export default function RootLayout({
  children, // Children prop to render nested components
}: Readonly<{
  children: React.ReactNode; // Type definition for children prop
}>) {
  return (
    // HTML document with language set to English
    <html lang="en">
      {/* Body with font classes and antialiasing for smooth text rendering */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Wrap the application in AuthProvider to provide authentication context */}
        <AuthProvider>
          <WorkflowProvider>
            {/* Render the Navbar component */}
          <Navbar />
            {/* Render the nested child components (pages) */}
          {children}
            {/* Render the Footer component */}
          <Footer />
          </WorkflowProvider>
        </AuthProvider>
      </body>
    </html>
  );
}