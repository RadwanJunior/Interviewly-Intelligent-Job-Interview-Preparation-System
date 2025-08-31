"use client";
import React, { createContext, useContext, useState } from "react";

type Stage = { id: string; title: string; isCompleted?: boolean };

type PrepData = {
  role?: string;
  company?: string;
  date?: string;
  focusAreas?: string[];
  researchNotes?: string;
  resumeNotes?: string;
  otherNotes?: string;
};

type PrepPlanContextType = {
  stages: Stage[];
  currentStageIndex: number;
  goToStage: (i: number) => void;
  nextStage: () => void;
  prevStage: () => void;
  data: PrepData;
  updateData: (patch: Partial<PrepData>) => void;
};

const defaultStages: Stage[] = [
  { id: "interview-details", title: "Details" },
  { id: "company-research", title: "Research" },
  { id: "additional-notes", title: "Notes" },
];

const PrepPlanContext = createContext<PrepPlanContextType | undefined>(undefined);

export const PrepPlanProvider = ({ children }: { children: React.ReactNode }) => {
  const [stages] = useState<Stage[]>(defaultStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [data, setData] = useState<PrepData>({});

  const goToStage = (i: number) => {
    if (i < 0 || i >= stages.length) return;
    setCurrentStageIndex(i);
  };

  const nextStage = () => setCurrentStageIndex((s) => Math.min(s + 1, stages.length - 1));
  const prevStage = () => setCurrentStageIndex((s) => Math.max(s - 1, 0));

  const updateData = (patch: Partial<PrepData>) => setData((d) => ({ ...d, ...patch }));

  return (
    <PrepPlanContext.Provider value={{ stages, currentStageIndex, goToStage, nextStage, prevStage, data, updateData }}>
      {children}
    </PrepPlanContext.Provider>
  );
};

export const usePrepPlan = () => {
  const ctx = useContext(PrepPlanContext);
  if (!ctx) throw new Error("usePrepPlan must be used within PrepPlanProvider");
  return ctx;
};