// Type definition for a workflow stage
export type WorkflowStage = {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
};

// Type definition for resume-related data
export type ResumeData = {
  file: File | null;
  text: string;
  hasExisting: boolean;
};

// Type definition for job-related data
export type JobDetailsData = {
  userId: string;
  companyName: string;
  jobTitle: string;
  location: string;
  jobType: string;
  description: string;
};

// Type definition for the Workflow Context
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