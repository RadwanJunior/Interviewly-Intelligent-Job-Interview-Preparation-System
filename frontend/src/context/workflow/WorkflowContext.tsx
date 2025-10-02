/**
 * WorkflowContext.tsx - React context and provider for workflow state
 * Provides workflow state and actions to the app via context.
 * Includes a custom hook for easy access to workflow state in components.
 */

"use client";
import React, { createContext, useContext } from "react";
import { WorkflowContextType } from "./types";
import { useWorkflowState } from "./useWorkflowState";

/**
 * The workflow context instance (do not use directly, use useWorkflow).
 */
const WorkflowContext = createContext<WorkflowContextType | null>(null);

/**
 * WorkflowProvider wraps the app and provides workflow state and actions.
 */
export const WorkflowProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const workflowState = useWorkflowState();

  return (
    <WorkflowContext.Provider value={workflowState}>
      {children}
    </WorkflowContext.Provider>
  );
};

/**
 * useWorkflow is a custom hook to access workflow state and actions.
 * Throws an error if used outside of WorkflowProvider.
 */
export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
};
