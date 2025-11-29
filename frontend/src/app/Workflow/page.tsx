"use client";
import React, { Suspense } from "react";
import WorkflowLayout from "@/components/workflow/WorkflowLayout";
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer";
// import ProtectedRoute from "@/components/ProtectedRoute";

const ResumeUpload = () => {
  return (
    // <ProtectedRoute>
    <WorkflowLayout title="Resume Upload">
      <Suspense fallback={<div className="p-6">Loading workflow...</div>}>
        <WorkflowStageRenderer />
      </Suspense>
    </WorkflowLayout>
    // </ProtectedRoute>
  );
};

export default ResumeUpload;
