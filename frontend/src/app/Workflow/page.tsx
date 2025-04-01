"use client";
import React from "react";
import WorkflowLayout from "@/components/workflow/WorkflowLayout";
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer";
// import ProtectedRoute from "@/components/ProtectedRoute";

const ResumeUpload = () => {
  return (
    // <ProtectedRoute>
    <WorkflowLayout title="Resume Upload">
      <WorkflowStageRenderer />
    </WorkflowLayout>
    // </ProtectedRoute>
  );
};

export default ResumeUpload;
