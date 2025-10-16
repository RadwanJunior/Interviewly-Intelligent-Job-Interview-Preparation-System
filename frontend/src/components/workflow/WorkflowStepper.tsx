/**
 * WorkflowStepper.tsx - Visual stepper component for workflow navigation.
 * Displays workflow stages, highlights progress, and allows navigation between steps.
 * Integrates with workflow context for state and actions.
 */
"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";


/**
 * Props for the WorkflowStepper component.
 * @property {string} [className] - Optional additional class names for styling.
 */
type WorkflowStepperProps = {
  className?: string;
};

/**
 * WorkflowStepper component for visualizing and navigating workflow stages.
 * Renders step indicators, connector lines, and supports navigation to completed/current steps.
 *
 * @param {WorkflowStepperProps} props - Component props.
 * @returns {JSX.Element} The rendered workflow stepper.
 */
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
                // Only allow navigation to completed stages or the current stage
                if (stage.isCompleted || index <= currentStageIndex) {
                  goToStage(index);
                }
              }}
              disabled={!stage.isCompleted && index > currentStageIndex}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                stage.isCompleted
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : stage.isActive
                  ? "border-2 border-primary text-primary shadow-sm"
                  : "border-2 border-muted text-muted-foreground",
                !stage.isCompleted && index > currentStageIndex 
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:ring-2 hover:ring-primary/30 hover:scale-105"
              )}
              aria-label={`Go to step ${index + 1}: ${stage.title}`}
            >
              {stage.isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <span className="font-medium">{index + 1}</span>
              )}
            </button>
            <span 
              className={cn(
                "text-xs mt-2 text-center max-w-[80px] transition-colors duration-300",
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
                "h-[2px] flex-1 mx-2 transition-colors duration-500",
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
