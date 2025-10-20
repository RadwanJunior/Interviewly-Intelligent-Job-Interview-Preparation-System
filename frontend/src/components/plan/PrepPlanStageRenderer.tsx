"use client";
import React, { useEffect, useRef } from "react";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";
import InterviewDetailsStage from "./stages/InterviewDetailsStage";
import CompanyResearchStage from "./stages/CompanyResearchStage";
import AdditionalNotesStage from "./stages/AdditionalNotesStage";
import { CardContent } from "@/components/ui/card";

const stageComponents: Record<string, React.ComponentType<{ isActive: boolean }>> = {
  "interview-details": InterviewDetailsStage,
  "company-research": CompanyResearchStage,
  "additional-notes": AdditionalNotesStage,
};

const PrepPlanStageRenderer = () => {
  const { stages, currentStageIndex } = usePrepPlan();
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (stageRefs.current[currentStageIndex]) {
      stageRefs.current[currentStageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [currentStageIndex]);

  return (
    <div className="space-y-12 workflow-stages">
      {stages.map((stage, index) => {
        const StageComponent = stageComponents[stage.id];
        if (!StageComponent) return <div key={stage.id}>Stage not found</div>;

        const isActive = index === currentStageIndex;
        const isPrevious = index < currentStageIndex;

        return (
          <section
            key={stage.id}
            ref={(el) => {
              stageRefs.current[index] = el;
            }}
            className={`transition-all duration-500 ${
              isActive ? "opacity-100" : isPrevious ? "opacity-75" : "opacity-40"
            }`}
          >
            <CardContent
              className={`pt-6 transition-all duration-300 ${
                isActive
                  ? "border-l-4 border-primary pl-5 bg-primary/5 rounded-md"
                  : ""
              }`}
            >
              <StageComponent isActive={isActive} />
            </CardContent>

            {index < stages.length - 1 && (
              <div className="w-full border-t border-border/20 my-8 opacity-30" />
            )}
          </section>
        );
      })}
    </div>
  );
};

export default PrepPlanStageRenderer;
