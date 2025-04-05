"use client"; // Indicates that this is a Client Component in Next.js

import { useState } from "react"; 
import { WorkflowStage, WorkflowContextType } from "./types"; 
import { 
  initialStages, 
  initialResumeData, 
  initialJobDetailsData 
} from "./initialState"; 

// Custom hook to manage the workflow state
export const useWorkflowState = (): WorkflowContextType => {
  // State for managing workflow stages
  const [stages, setStages] = useState<WorkflowStage[]>(initialStages);
  // State for tracking the current stage index
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  // State for managing resume-related data
  const [resumeData, setResumeData] = useState(initialResumeData);
  // State for managing job-related data
  const [jobDetailsData, setJobDetailsData] = useState(initialJobDetailsData);

  // Function to navigate to the next stage
  const goToNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      setStages((prevStages) => {
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

  // Function to navigate to the previous stage
  const goToPreviousStage = () => {
    if (currentStageIndex > 0) {
      setStages((prevStages) => {
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

  // Function to navigate to a specific stage by index
  const goToStage = (index: number) => {
    if (index >= 0 && index < stages.length) {
      setStages((prevStages) => {
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

  // Function to mark the current stage as completed
  const completeCurrentStage = () => {
    setStages((prevStages) => {
      const newStages = [...prevStages];
      newStages[currentStageIndex] = {
        ...newStages[currentStageIndex],
        isCompleted: true, 
      };
      return newStages;
    });
  };

  // Function to update resume-related data
  const updateResumeData = (data: Partial<typeof resumeData>) => {
    setResumeData(prev => ({ ...prev, ...data })); 
  };

  // Function to update job-related data
  const updateJobDetailsData = (data: Partial<typeof jobDetailsData>) => {
    setJobDetailsData(prev => ({ ...prev, ...data })); 
  };

  // Return the workflow state and functions for managing it
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
    // loaderState,
    // showLoader,
    // hideLoader,
    // updateLoaderProgress,
  };
};