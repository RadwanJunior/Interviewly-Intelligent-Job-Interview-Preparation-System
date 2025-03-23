"use client";
import { useState } from "react";
import { WorkflowStage, WorkflowContextType } from "./types";
import { 
  initialStages, 
  initialResumeData, 
  initialJobDetailsData 
} from "./initialState";

export const useWorkflowState = (): WorkflowContextType => {
  const [stages, setStages] = useState<WorkflowStage[]>(initialStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [resumeData, setResumeData] = useState(initialResumeData);
  const [jobDetailsData, setJobDetailsData] = useState(initialJobDetailsData);

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

  const updateResumeData = (data: Partial<typeof resumeData>) => {
    setResumeData(prev => ({ ...prev, ...data }));
  };

  const updateJobDetailsData = (data: Partial<typeof jobDetailsData>) => {
    setJobDetailsData(prev => ({ ...prev, ...data }));
  };

  return {
    stages,
    currentStageIndex,
    goToNextStage,
    goToPreviousStage,
    goToStage,
    completeCurrentStage,
    resumeData,
    updateResumeData,
    jobDetailsData,
    updateJobDetailsData,
  };
};
