"use client"; // Indicates that this is a Client Component in Next.js

import { WorkflowStage, ResumeData, JobDetailsData } from "./types"; 

// Initial stages for the workflow
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
  
];

// Initial data for the resume
export const initialResumeData: ResumeData = {
  file: null, 
  text: "", 
  hasExisting: false, 
};

// Initial data for the job details
export const initialJobDetailsData: JobDetailsData = {
  userId: "", 
  companyName: "", 
  jobTitle: "", 
  location: "", 
  jobType: "Full-time", 
  description: "", 
};