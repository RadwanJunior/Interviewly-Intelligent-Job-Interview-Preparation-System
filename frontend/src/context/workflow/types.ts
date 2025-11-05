<<<<<<< HEAD
=======

>>>>>>> 32d61ad6b592fe1179f83f19d2a6fba1c6b58eae
/**
 * Represents a single stage in the workflow process.
 * @property {string} id - Unique identifier for the stage.
 * @property {string} title - Display name of the stage.
 * @property {string} description - Description of the stage's purpose.
 * @property {boolean} isCompleted - Whether the stage has been completed.
 * @property {boolean} isActive - Whether the stage is currently active.
 */
export type WorkflowStage = {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
};


/**
 * Represents the user's resume data in the workflow.
 * @property {string | undefined} fileName - Name of the uploaded resume file.
 * @property {File | null} file - The uploaded resume file object.
 * @property {string} text - Extracted or inputted resume text.
 * @property {boolean} hasExisting - Whether the user has an existing resume.
 * @property {string | undefined} resumeId - Unique identifier for the resume.
 */
export type ResumeData = {
  fileName: string | undefined;
  file: File | null;
  text: string;
  hasExisting: boolean;
  resumeId: string | undefined;
};


/**
 * Represents job details data provided by the user.
 * @property {string} JobDescriptionId - Unique identifier for the job description.
 * @property {string} userId - ID of the user associated with the job.
 * @property {string} companyName - Name of the company.
 * @property {string} jobTitle - Title of the job position.
 * @property {string} location - Location of the job.
 * @property {string} jobType - Type of job (e.g., full-time, part-time).
 * @property {string} description - Description of the job role.
 */
export type JobDetailsData = {
  JobDescriptionId: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  location: string;
  jobType: string;
  description: string;
};


/**
 * The context type for the workflow, including state and actions.
 * @property {WorkflowStage[]} stages - Array of workflow stages.
 * @property {number} currentStageIndex - Index of the currently active stage.
 * @property {() => void} goToNextStage - Advances to the next stage.
 * @property {() => void} goToPreviousStage - Moves to the previous stage.
 * @property {(index: number) => void} goToStage - Jumps to a specific stage by index.
 * @property {() => void} completeCurrentStage - Marks the current stage as completed.
 * @property {ResumeData} resumeData - Resume data for the workflow.
 * @property {(data: Partial<ResumeData>) => void} updateResumeData - Updates resume data.
 * @property {JobDetailsData} jobDetailsData - Job details data for the workflow.
 * @property {(data: Partial<JobDetailsData>) => void} updateJobDetailsData - Updates job details data.
<<<<<<< HEAD
 * @property {string} interviewType - Type of interview (text or call).
 * @property {(type: "text" | "call") => void} setInterviewType - Sets the interview type.
=======
>>>>>>> 32d61ad6b592fe1179f83f19d2a6fba1c6b58eae
 */
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
  interviewType: "text" | "call";
  setInterviewType: (type: "text" | "call") => void;
};
