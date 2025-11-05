/**
 * Test Utilities
 * Custom render function and utilities for testing React components
 * Wraps components with necessary providers (Auth, Workflow, etc.)
 *
 * This is a utility file - not a test suite
 */

// Prevent Jest from treating this as a test suite
if (process.env.NODE_ENV === "test") {
  // This file only exports utilities
}

import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { AuthProvider } from "@/context/AuthContext";
import { WorkflowProvider } from "@/context/workflow";

/**
 * Custom render function that wraps components with all necessary providers
 * Use this instead of the default render from @testing-library/react
 */
interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: AllProvidersProps) => {
  return (
    <AuthProvider>
      <WorkflowProvider>{children}</WorkflowProvider>
    </AuthProvider>
  );
};

/**
 * Custom render with providers
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from React Testing Library
export * from "@testing-library/react";

// Override render with our custom version
export { customRender as render };
