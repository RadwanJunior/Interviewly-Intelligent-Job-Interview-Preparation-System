"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export type WorkflowStage = {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
};

type WorkflowContextType = {
  stages: WorkflowStage[];
  currentStageIndex: number;
  goToNextStage: () => void;
  goToPreviousStage: () => void;
  goToStage: (index: number) => void;
  completeCurrentStage: () => void;
  resumeData: {
    file: File | null;
    text: string;
    hasExisting: boolean;
  };
  updateResumeData: (data: Partial<{
    file: File | null;
    text: string;
    hasExisting: boolean;
  }>) => void;
  jobDescriptionData: {
    file: File | null;
    text: string;
  };
  updateJobDescriptionData: (data: Partial<{
    file: File | null;
    text: string;
  }>) => void;
};

const initialStages: WorkflowStage[] = [
  {
    id: "resume-upload",
    title: "Resume Upload",
    description: "Upload your resume or use an existing one",
    isCompleted: false,
    isActive: true,
  },
  {
    id: "resume-preview",
    title: "Resume Preview",
    description: "Review and confirm your resume",
    isCompleted: false,
    isActive: false,
  },
  // New stages can be easily added here
];

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const WorkflowProvider = ({ children }: { children: ReactNode }) => {
  const [stages, setStages] = useState<WorkflowStage[]>(initialStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [resumeData, setResumeData] = useState({
    file: null as File | null,
    text: "",
    hasExisting: false,
  });
  const [jobDescriptionData, setJobDescriptionData] = useState({
    file: null as File | null,
    text: "",
  });

  const goToNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      setStages(prevStages => {
        const newStages = [...prevStages];
        newStages[currentStageIndex] = {
          ...newStages[currentStageIndex],
          isActive: false,
        };
        newStages[currentStageIndex + 1] = {
          ...newStages[currentStageIndex + 1],
          isActive: true,
        };
        return newStages;
      });
      setCurrentStageIndex(prevIndex => prevIndex + 1);
    }
  };

  const goToPreviousStage = () => {
    if (currentStageIndex > 0) {
      setStages(prevStages => {
        const newStages = [...prevStages];
        newStages[currentStageIndex] = {
          ...newStages[currentStageIndex],
          isActive: false,
        };
        newStages[currentStageIndex - 1] = {
          ...newStages[currentStageIndex - 1],
          isActive: true,
        };
        return newStages;
      });
      setCurrentStageIndex(prevIndex => prevIndex - 1);
    }
  };

  const goToStage = (index: number) => {
    if (index >= 0 && index < stages.length) {
      setStages(prevStages => {
        const newStages = [...prevStages];
        newStages[currentStageIndex] = {
          ...newStages[currentStageIndex],
          isActive: false,
        };
        newStages[index] = {
          ...newStages[index],
          isActive: true,
        };
        return newStages;
      });
      setCurrentStageIndex(index);
    }
  };

  const completeCurrentStage = () => {
    setStages(prevStages => {
      const newStages = [...prevStages];
      newStages[currentStageIndex] = {
        ...newStages[currentStageIndex],
        isCompleted: true,
      };
      return newStages;
    });
  };

  const updateResumeData = (data: Partial<{
    file: File | null;
    text: string;
    hasExisting: boolean;
  }>) => {
    setResumeData(prev => ({ ...prev, ...data }));
  };

  const updateJobDescriptionData = (data: Partial<{
    file: File | null;
    text: string;
  }>) => {
    setJobDescriptionData(prev => ({ ...prev, ...data }));
  };

  return (
    <WorkflowContext.Provider
      value={{
        stages,
        currentStageIndex,
        goToNextStage,
        goToPreviousStage,
        goToStage,
        completeCurrentStage,
        resumeData,
        updateResumeData,
        jobDescriptionData,
        updateJobDescriptionData,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
};
