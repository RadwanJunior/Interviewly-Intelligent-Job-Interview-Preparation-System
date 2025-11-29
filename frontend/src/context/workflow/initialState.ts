/**
 * initialState.ts - Defines initial state objects for the workflow context.
 * Includes default workflow stages, resume data, and job details data.
 * Used to initialize the workflow state in context and hooks.
 */
"use client";
import { WorkflowStage, ResumeData, JobDetailsData } from "./types";

/**
 * The default set of workflow stages for the job application process.
 * Each stage represents a step in the workflow (e.g., resume upload, preview, job details).
 * New stages can be added to extend the workflow.
 */
export const initialStages: WorkflowStage[] = [
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
  {
    id: "job-details",
    title: "Job Details",
    description: "Enter basic information about the job",
    isCompleted: false,
    isActive: false,
  },
  // New stages can be easily added here
];


/**
 * The initial state for resume data in the workflow.
 * Used to reset or initialize the resume upload step.
 */
export const initialResumeData: ResumeData = {
  fileName: undefined,
  resumeId: undefined,
  file: null,
  text: "",
  hasExisting: false,
};


/**
 * The initial state for job details data in the workflow.
 * Used to reset or initialize the job details step.
 */
export const initialJobDetailsData: JobDetailsData = {
  JobDescriptionId: "",
  userId: "",
  companyName: "",
  jobTitle: "",
  location: "",
  jobType: "Full-time",
  description: "",
};
