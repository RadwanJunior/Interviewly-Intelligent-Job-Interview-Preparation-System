"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import WorkflowStepper from "./WorkflowStepper";
import { useWorkflow } from "@/context/WorkflowContext";

type WorkflowLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

const WorkflowLayout = ({ children, title = "Application Workflow" }: WorkflowLayoutProps) => {
  const { stages, currentStageIndex } = useWorkflow();
  const progress = ((currentStageIndex + 1) / stages.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">{title}</h1>
      
      {/* Progress indicator and Step stepper - both sticky now */}
      <div className="sticky top-0 z-20 bg-background pt-4 pb-4 shadow-sm">
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStageIndex + 1} of {stages.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step stepper */}
        <WorkflowStepper className="mb-2" />
      </div>

      {/* Content with continuous scroll */}
      <Card className="animate-fade-in mt-4">
        {children}
      </Card>
    </div>
  );
};

export default WorkflowLayout;

