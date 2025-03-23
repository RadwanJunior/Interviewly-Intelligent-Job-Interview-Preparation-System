export type WorkflowStage = {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    isActive: boolean;
  };
  
  export type ResumeData = {
    file: File | null;
    text: string;
    hasExisting: boolean;
  };
  
  export type JobDetailsData = {
    userId: string;
    companyName: string;
    jobTitle: string;
    location: string;
    jobType: string;
    description: string;
  };
  
  export type WorkflowContextType = {
    stages: WorkflowStage[];
    currentStageIndex: number;
    goToNextStage: () => void;
    goToPreviousStage: () => void;
    goToStage: (index: number) => void;
    completeCurrentStage: () => void;
    resumeData: ResumeData;
    updateResumeData: (data: Partial<ResumeData>) => void;
    jobDetailsData: JobDetailsData;
    updateJobDetailsData: (data: Partial<JobDetailsData>) => void;
  };
