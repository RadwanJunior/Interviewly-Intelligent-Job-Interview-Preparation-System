"use client";
import React from "react";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";

const PrepPlanStepper = ({ className = "" }: { className?: string }) => {
  const { stages, currentStageIndex, goToStage } = usePrepPlan();

  return (
    <div className={`flex gap-3 items-center overflow-x-auto ${className}`}>
      {stages.map((s, i) => (
        <button key={s.id} onClick={() => goToStage(i)} className={`px-3 py-1 rounded-md text-sm ${i === currentStageIndex ? 'bg-primary text-white' : 'bg-muted'}`}>
          {s.title}
        </button>
      ))}
    </div>
  );
};

export default PrepPlanStepper;