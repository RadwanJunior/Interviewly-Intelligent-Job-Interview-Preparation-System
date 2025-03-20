"use client";
import React from "react";
import { WorkflowProvider } from "@/context/WorkflowContext";
import WorkflowLayout from "@/components/workflow/WorkflowLayout";
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer";
import ProtectedRoute from "@/components/ProtectedRoute";

const ResumeUpload = () => {
  return (
    <ProtectedRoute>
      <WorkflowProvider>
        <WorkflowLayout title="Resume Upload">
          <WorkflowStageRenderer />
        </WorkflowLayout>
      </WorkflowProvider>
    </ProtectedRoute>
  );
};

export default ResumeUpload;
