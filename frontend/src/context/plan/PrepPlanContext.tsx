"use client";
import React, { createContext, useContext, useState } from "react";
// import { supabase } from "/backend/app/services/supabase_service"; 

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
  // savePlan: () => Promise<void>; 
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

  // ✅ Hardcoded test data here
  const [data, setData] = useState<PrepData>({
    role: "Software Engineer Intern",
    company: "OpenAI",
    date: "2025-10-25",
    focusAreas: ["System Design", "Behavioral", "LeetCode"],
    researchNotes: "OpenAI focuses on AI safety, GPT models, and deployment ethics.",
    resumeNotes: "Highlight Python, ML projects, and hackathons.",
    otherNotes: "Ask about mentorship programs and tech stack.",
  });

  const goToStage = (i: number) => {
    if (i < 0 || i >= stages.length) return;
    setCurrentStageIndex(i);
  };

  const nextStage = () => setCurrentStageIndex((s) => Math.min(s + 1, stages.length - 1));
  const prevStage = () => setCurrentStageIndex((s) => Math.max(s - 1, 0));

  const updateData = (patch: Partial<PrepData>) => setData((d) => ({ ...d, ...patch }));

  // // Save responses to Supabase
  // const savePlan = async () => {
  //   const { error } = await supabase.from("prep_plans").insert([data]);
  //   if (error) {
  //     console.error("❌ Error saving plan:", error);
  //   } else {
  //     console.log("✅ Plan saved successfully:", data);
  //   }
  // };

  return (
    <PrepPlanContext.Provider
      value={{
        stages,
        currentStageIndex,
        goToStage,
        nextStage,
        prevStage,
        data,
        updateData,
        // savePlan, 
      }}
    >
      {children}
    </PrepPlanContext.Provider>
  );
};

export const usePrepPlan = () => {
  const ctx = useContext(PrepPlanContext);
  if (!ctx) throw new Error("usePrepPlan must be used within PrepPlanProvider");
  return ctx;
};
