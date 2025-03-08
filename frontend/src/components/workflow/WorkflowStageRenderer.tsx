"use client";
import React, { useEffect, useRef } from "react";
import { useWorkflow } from "@/context/WorkflowContext";
import ResumeUploadStage from "./stages/ResumeUploadStage";
import ResumePreviewStage from "./stages/ResumePreviewStage";
import JobDetailsStage from "./stages/JobDetailsStage";
import JobDescriptionStage from "./stages/JobDescriptionStage";
import { CardContent } from "@/components/ui/card";

// Map stage IDs to their respective components
const stageComponents: Record<string, React.ComponentType> = {
  "resume-upload": ResumeUploadStage,
  "resume-preview": ResumePreviewStage,
  "job-details": JobDetailsStage,
  "job-description": JobDescriptionStage,
  // Add new stages here as they are created
};

const WorkflowStageRenderer = () => {
  const { stages, currentStageIndex } = useWorkflow();
  const stageRefs = useRef<(HTMLElement | null)[]>([]);
  
  // Effect to scroll to the current active stage and apply focus styles
  useEffect(() => {
    // Only scroll if we have refs set up
    if (stageRefs.current[currentStageIndex]) {
      stageRefs.current[currentStageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [currentStageIndex]);
  
  return (
    <div className="workflow-stages space-y-12">
      {stages.map((stage, index) => {
        // Get the component for the current stage
        const StageComponent = stageComponents[stage.id];
        
        if (!StageComponent) {
          return <div key={stage.id}>Stage not found</div>;
        }
        
        const isActive = index === currentStageIndex;
        const isPrevious = index < currentStageIndex;
        const isNext = index > currentStageIndex;
        
        return (
          <section 
            key={stage.id}
            id={`stage-${stage.id}`}
            ref={(el) => (stageRefs.current[index] = el)}
            className={`
              scroll-mt-32 transition-all duration-500
              ${isActive ? 'opacity-100' : isPrevious ? 'opacity-80' : 'opacity-40'}
              ${!stage.isCompleted && !isActive ? 'pointer-events-none' : ''}
            `}
          >
            <CardContent 
              className={`
                pt-6 transition-all duration-300 
                ${isActive ? 'scale-100 border-l-4 border-primary pl-5' : 'scale-97'}
                ${isPrevious ? 'scale-98 hover:scale-99' : ''}
                ${isNext && index === currentStageIndex + 1 ? 'scale-95 hover:opacity-50' : ''}
              `}
            >
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
