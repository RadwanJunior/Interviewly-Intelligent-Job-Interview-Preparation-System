"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

type WorkflowStepperProps = {
  className?: string;
};

const WorkflowStepper = ({ className }: WorkflowStepperProps) => {
  const { stages, currentStageIndex, goToStage } = useWorkflow();

  return (
    <div className={cn("flex items-center justify-center w-full", className)}>
      {stages.map((stage, index) => (
        <React.Fragment key={stage.id}>
          {/* Step indicator */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                // Only allow navigation to completed stages or the current stage + 1
                if (stage.isCompleted || index <= currentStageIndex + 1) {
                  goToStage(index);
                }
              }}
              disabled={!stage.isCompleted && index > currentStageIndex + 1}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                stage.isCompleted
                  ? "bg-primary text-primary-foreground" 
                  : stage.isActive
                  ? "border-2 border-primary text-primary"
                  : "border-2 border-muted text-muted-foreground",
                !stage.isCompleted && index > currentStageIndex + 1 
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:ring-2 hover:ring-primary/30"
              )}
            >
              {stage.isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>
            <span 
              className={cn(
                "text-xs mt-2 text-center max-w-[80px]",
                stage.isActive || stage.isCompleted ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {stage.title}
            </span>
          </div>

          {/* Connector line between steps */}
          {index < stages.length - 1 && (
            <div 
              className={cn(
                "h-[2px] flex-1 mx-2",
                index < currentStageIndex ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default WorkflowStepper;
