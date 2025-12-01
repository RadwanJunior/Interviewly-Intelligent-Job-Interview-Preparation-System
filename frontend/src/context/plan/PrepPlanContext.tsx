"use client";
import React, { createContext, useContext, useState } from "react";
import { createPreparationPlan } from "@/lib/api";

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
  savePlan: () => Promise<{ success: boolean; planId?: string; error?: string }>;
  isSaving: boolean;
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
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with empty data - user will input their own
  const [data, setData] = useState<PrepData>({
    role: "",
    company: "",
    date: "",
    focusAreas: [],
    researchNotes: "",
    resumeNotes: "",
    otherNotes: "",
  });

  const goToStage = (i: number) => {
    if (i < 0 || i >= stages.length) return;
    setCurrentStageIndex(i);
  };

  const nextStage = () => setCurrentStageIndex((s) => Math.min(s + 1, stages.length - 1));
  const prevStage = () => setCurrentStageIndex((s) => Math.max(s - 1, 0));

  const updateData = (patch: Partial<PrepData>) => setData((d) => ({ ...d, ...patch }));

  /**
   * Save the preparation plan data to Supabase
   * Maps the context data to the backend API format
   */
  const savePlan = async (): Promise<{ success: boolean; planId?: string; error?: string }> => {
    setIsSaving(true);
    try {
      console.log("💾 Saving preparation plan:", data);

      // Map context data to backend API format
      const planPayload = {
        jobTitle: data.role || "",
        company: data.company || "",
        interviewDate: data.date || "",
        steps: [], // Will be populated later when we generate the plan
        focusAreas: data.focusAreas || [],
        researchNotes: data.researchNotes || "",
        resumeNotes: data.resumeNotes || "",
        otherNotes: data.otherNotes || "",
      };

      const result = await createPreparationPlan(planPayload);

      console.log("✅ Plan saved successfully:", result);
      return { success: true, planId: result.id };
    } catch (error) {
      console.error("❌ Error saving plan:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save plan"
      };
    } finally {
      setIsSaving(false);
    }
  };

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
        savePlan,
        isSaving,
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
