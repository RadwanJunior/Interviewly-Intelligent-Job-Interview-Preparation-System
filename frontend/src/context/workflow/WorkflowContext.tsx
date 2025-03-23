"use client"; // Indicates that this is a Client Component in Next.js

import React, { createContext, useContext } from "react"; 
import { WorkflowContextType } from "./types"; 
import { useWorkflowState } from "./useWorkflowState"; 

// Create a context for the workflow with an initial value of `null`
const WorkflowContext = createContext<WorkflowContextType | null>(null);

// WorkflowProvider component to wrap the application and provide workflow state
export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const workflowState = useWorkflowState(); 

  return (
    // Provide the workflow state to all child components
    <WorkflowContext.Provider value={workflowState}>
      {children}
    </WorkflowContext.Provider>
  );
};

// Custom hook to access the workflow context
export const useWorkflow = () => {
  const context = useContext(WorkflowContext); 
  if (!context) {
    // Throw an error if the hook is used outside of a WorkflowProvider
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context; 
};