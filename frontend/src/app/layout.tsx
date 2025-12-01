import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WorkflowProvider } from "@/context/workflow";
import { PrepPlanProvider } from "@/context/plan/PrepPlanContext";

export const metadata: Metadata = {
  title: "Interviewly",
  description: "AI-Powered Interview Preparation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <WorkflowProvider>
            <PrepPlanProvider>
              <Navbar />
              {children}
              <Footer />
            </PrepPlanProvider>
          </WorkflowProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
