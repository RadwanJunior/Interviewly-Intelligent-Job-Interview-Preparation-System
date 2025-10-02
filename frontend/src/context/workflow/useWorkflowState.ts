/**
 * useWorkflowState.ts - Custom React hook for workflow state management
 * Manages workflow stages, resume/job data, and provides navigation and update actions.
 * Used by WorkflowContext to provide state to the app.
 */

"use client";
import { useState } from "react";
import { WorkflowStage, WorkflowContextType } from "./types";
import {
  initialStages,
  initialResumeData,
  initialJobDetailsData,
} from "./initialState";

/**
 * Custom React hook to manage workflow state and actions.
 * @returns {WorkflowContextType} State and actions for workflow navigation and data updates.
 */
export const useWorkflowState = (): WorkflowContextType => {
  const [stages, setStages] = useState<WorkflowStage[]>(initialStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [resumeData, setResumeData] = useState(initialResumeData);
  const [jobDetailsData, setJobDetailsData] = useState(initialJobDetailsData);
  // const [loaderState, setLoaderState] = useState({
  //   isVisible: false,
  //   progress: 0,
  //   isComplete: false,
  //   jobDescriptionId: "",
  // });

  /**
   * Advances the workflow to the next stage.
   * Deactivates the current stage and activates the next one.
   * Does nothing if already at the last stage.
   */
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
      setCurrentStageIndex((prevIndex) => prevIndex + 1);
    }
  };

  /**
   * Moves the workflow back to the previous stage.
   * Deactivates the current stage and activates the previous one.
   * Does nothing if already at the first stage.
   */
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
      setCurrentStageIndex((prevIndex) => prevIndex - 1);
    }
  };

  /**
   * Jumps to a specific stage in the workflow by index.
   * Deactivates the current stage and activates the target stage.
   * @param {number} index - The index of the stage to activate.
   */
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

  /**
   * Marks the current stage as completed.
   * Does not advance to the next stage automatically.
   */
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

  /**
   * Updates the resume data in the workflow state.
   * Merges new data with the existing resume data.
   * @param {Partial<typeof resumeData>} data - Partial resume data to update.
   */
  const updateResumeData = (data: Partial<typeof resumeData>) => {
    setResumeData((prev) => ({ ...prev, ...data }));
  };

  /**
   * Updates the job details data in the workflow state.
   * Merges new data with the existing job details data.
   * @param {Partial<typeof jobDetailsData>} data - Partial job details data to update.
   */
  const updateJobDetailsData = (data: Partial<typeof jobDetailsData>) => {
    setJobDetailsData((prev) => ({ ...prev, ...data }));
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
    // loaderState,
    // showLoader,
    // hideLoader,
    // updateLoaderProgress,
  };
};
