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
      <h1 className="text-3xl font-heading font-bold text-center mb-6 text-primary animate-fade-in pt-16">
        {title}
      </h1>

      {/* Progress indicator and Step stepper */}
      <div className="pt-4 pb-4">
        <div className="mb-4 ">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground/80">
              Step {currentStageIndex + 1} of {stages.length}
            </span>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step stepper */}
        <WorkflowStepper className="mb-2" />
      </div>

      {/* Content with continuous scroll */}
      <Card className="animate-fade-up mt-6 border border-border/50 rounded-xl shadow-md overflow-hidden">
        {children}
      </Card>
    </div>
  );
};

export default WorkflowLayout;
