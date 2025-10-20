"use client";
import React from "react";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";

const PrepPlanStepper = ({ className = "" }: { className?: string }) => {
  const { stages, currentStageIndex, goToStage } = usePrepPlan();

  return (
    <div className={`flex gap-3 items-center overflow-x-auto ${className}`}>
      {stages.map((s, i) => {
        // Determine if the stage should be clickable
        const isClickable = i <= currentStageIndex; // only current or previous stages

        return (
          <button
            key={s.id}
            onClick={() => isClickable && goToStage(i)}
            className={`
              px-3 py-1 rounded-md text-sm
              ${i === currentStageIndex ? "bg-primary text-white" : "bg-muted"}
              ${!isClickable ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            `}
            disabled={!isClickable} // disable future stages
          >
            {s.title}
          </button>
        );
      })}
    </div>
  );
};

export default PrepPlanStepper;
