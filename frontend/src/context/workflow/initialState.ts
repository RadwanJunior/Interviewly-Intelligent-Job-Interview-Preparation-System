"use client";
import { WorkflowStage, ResumeData, JobDetailsData } from "./types";

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

export const initialResumeData: ResumeData = {
  file: null,
  text: "",
  hasExisting: false,
};

export const initialJobDetailsData: JobDetailsData = {
  companyName: "",
  jobTitle: "",
  location: "",
  jobType: "Full-time",
  description: "",
};
