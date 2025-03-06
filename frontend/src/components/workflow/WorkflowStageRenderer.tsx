"use client";
import React from "react";
import { useWorkflow } from "@/context/WorkflowContext";
import ResumeUploadStage from "./stages/ResumeUploadStage";
import ResumePreviewStage from "./stages/ResumePreviewStage";
import { CardContent } from "@/components/ui/card";

// Map stage IDs to their respective components
const stageComponents: Record<string, React.ComponentType> = {
  "resume-upload": ResumeUploadStage,
  "resume-preview": ResumePreviewStage,
  // Add new stages here as they are created
  // Example: "job-description": JobDescriptionStage,
};

const WorkflowStageRenderer = () => {
  const { stages } = useWorkflow();
  
  return (
    <div className="workflow-stages space-y-12">
      {stages.map((stage, index) => {
        // Get the component for the current stage
        const StageComponent = stageComponents[stage.id];
        
        if (!StageComponent) {
          return <div key={stage.id}>Stage not found</div>;
        }
        
        return (
          <section 
            key={stage.id}
            id={`stage-${stage.id}`}
            className="scroll-mt-32 transition-all duration-500"
          >
            <CardContent className="pt-6">
              <StageComponent />
            </CardContent>
            
            {index < stages.length - 1 && (
              <div className="w-full border-t border-border-200 my-8 opacity-30" />
            )}
          </section>
        );
      })}
    </div>
  );
};

export default WorkflowStageRenderer;
