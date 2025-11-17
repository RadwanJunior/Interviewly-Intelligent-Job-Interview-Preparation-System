"use client";
import React, { Suspense } from "react";
import WorkflowLayout from "@/components/workflow/WorkflowLayout";
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer";
// import ProtectedRoute from "@/components/ProtectedRoute";

const ResumeUploadContent = () => (
  // <ProtectedRoute>
  <WorkflowLayout title="Resume Upload">
    <WorkflowStageRenderer />
  </WorkflowLayout>
  // </ProtectedRoute>
);

const ResumeUpload = () => (
  <Suspense fallback={<div className="p-6">Loading workflow...</div>}>
    <ResumeUploadContent />
  </Suspense>
);

export default ResumeUpload;
