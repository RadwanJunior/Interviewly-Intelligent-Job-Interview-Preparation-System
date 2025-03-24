"use client";
import React, { createContext, useContext } from "react";
import { WorkflowContextType } from "./types";
import { useWorkflowState } from "./useWorkflowState";

const WorkflowContext = createContext<WorkflowContextType | null>(null);

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

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
};
