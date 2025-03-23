"use client"; // Indicates that this is a Client Component in Next.js

import React from "react"; 
import { WorkflowProvider } from "@/context/WorkflowContext"; 
import WorkflowLayout from "@/components/workflow/WorkflowLayout"; 
import WorkflowStageRenderer from "@/components/workflow/WorkflowStageRenderer"; 
import ProtectedRoute from "@/components/ProtectedRoute"; 

const ResumeUpload = () => {
  return (
    // Wrap the component in ProtectedRoute to ensure only authenticated users can access it
    <ProtectedRoute>
      {/* Provide workflow context to the entire component tree */}
      <WorkflowProvider>
        {/* Use WorkflowLayout to structure the page with a title */}
        <WorkflowLayout title="Resume Upload">
          {/* Render the current workflow stage */}
          <WorkflowStageRenderer />
        </WorkflowLayout>
      </WorkflowProvider>
    </ProtectedRoute>
  );
};

export default ResumeUpload; 