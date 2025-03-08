"use client";
import React from "react";
import { WorkflowProvider } from "@/context/WorkflowContext";
import WorkflowLayout from "@/components/workflow/WorkflowLayout";
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer";

const ResumeUpload = () => {
  return (
    <WorkflowProvider>
      <WorkflowLayout title="Resume Upload">
        <WorkflowStageRenderer />
      </WorkflowLayout>
    </WorkflowProvider>
  );
};

export default ResumeUpload;