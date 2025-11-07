/**
 * api.ts - Centralized API utility for frontend HTTP requests
 * Provides functions for authentication, resume, job, interview, audio, and dashboard endpoints.
 * Uses Axios for HTTP requests and handles cookies/tokens as needed.
 */

import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000", // Change this for production
  withCredentials: true, // Ensures cookies (tokens) are sent
  headers: { "Content-Type": "application/json" },
});

// Log API base URL (commented out for tests to avoid axios mock timing issues)
// console.log("API base URL:", api.defaults.baseURL);

/**
 * Sign up a new user.
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @param email - User's email address
 * @param password - User's password
 * @returns API response data
 */
export async function signup(
  firstName: string,
  lastName: string,
  email: string,
  password: string
) {
  const response = await api.post("/auth/signup", {
    firstName,
    lastName,
    email,
    password,
  });
  return response.data;
}

/**
 * Log in a user.
 * @param email - User's email address
 * @param password - User's password
 * @returns API response data
 */
export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", { email, password });
  // Do not set token from response because it is set as an HTTP-only cookie
  return response.data;
}

/**
 * Refresh the access token using the refresh token cookie.
 * @returns API response data
 */
export async function refreshToken() {
  try {
    const response = await api.post("/auth/refresh", {}, {
      withCredentials: true, // <-- add this to send cookies
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error refreshing token:",
        error.response?.data || error.message
      );
    } else {
      console.error("Error refreshing token:", (error as Error).message);
    }
    throw error;
  }
}

/**
 * Log out the current user (clears cookies on backend).
 */
export async function logout() {
  await api.post("/auth/logout");
}

/**
 * Upload a resume file for the current user.
 * @param file - Resume file (.pdf or .docx)
 * @returns API response data
 */
export async function uploadResume(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/resumes/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Get the current user's resume extracted text.
 * @returns API response data
 */
export async function getResume() {
  const response = await api.get("/resumes/");
  return response.data;
}

/**
 * Update the extracted text of the current user's resume.
 * @param updatedText - The new extracted text
 * @returns API response data
 */
export async function updateResume(updatedText: string) {
  const response = await api.put("/resumes/", {
    updated_text: updatedText,
  });
  return response.data;
}
/**
 * Get the resume extracted text for a specific user.
 * @param userId - The user ID
 * @returns API response data
 */
export async function getResumeFromUser(userId: string) {
  const response = await api.get(`/resumes/${userId}`);
  return response.data;
}

/**
 * Create a new job description for the current user.
 * @param jobTitle - Job title
 * @param companyName - Company name
 * @param location - Job location
 * @param jobType - Type of job
 * @param description - Job description text
 * @returns API response data
 */
export async function createJobDescription(
  jobTitle: string,
  companyName: string,
  location: string,
  jobType: string,
  description: string
) {
  const response = await api.post("/job_description", {
    job_title: jobTitle,
    company_name: companyName,
    location: location,
    job_type: jobType,
    description: description,
  });
  return response.data;
}

/**
 * Create a new interview session for a job description.
 * @param data - Object with job_description_id
 * @returns API response data
 */
export async function createInterviewSession(data: {
  job_description_id: string;
}) {
  const response = await api.post("/interview/create", data);
  return response.data;
}

/**
 * Get the progress status of an interview session.
 * @param sessionId - Interview session ID
 * @returns API response data
 */
export async function getInterviewStatus(sessionId: string) {
  const response = await api.get(`/interview/status/${sessionId}`);
  return response.data;
}

/**
 * Get the list of questions for an interview session.
 * @param sessionId - Interview session ID
 * @returns API response data
 */
export async function getInterviewQuestions(sessionId: string) {
  const response = await api.get(`/interview/questions/${sessionId}`);
  return response.data;
}

/**
 * Upload an audio file for a specific interview question.
 * @param file - Audio file
 * @param interview_id - Interview session ID
 * @param question_id - Question ID
 * @param question_text - The question text
 * @param question_order - The order of the question
 * @param is_last_question - Whether this is the last question
 * @param mime_type - MIME type of the audio file
 * @returns API response data
 */
export async function uploadAudio({
  file,
  interview_id,
  question_id,
  question_text,
  question_order,
  is_last_question = false,
  mime_type = "audio/webm",
}: {
  file: File;
  interview_id: string;
  question_id: string;
  question_text: string;
  question_order: number;
  is_last_question?: boolean;
  mime_type?: string;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("interview_id", interview_id);
  formData.append("question_id", question_id);
  formData.append("question_text", question_text);
  formData.append("question_order", String(question_order));
  formData.append("is_last_question", String(is_last_question));
  formData.append("mime_type", mime_type);

  const response = await api.post("/audio/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * Manually trigger feedback generation for an interview session.
 * @param interview_id - Interview session ID
 * @returns API response data
 */
export async function triggerFeedbackGeneration(interview_id: string) {
  const response = await api.post(`/audio/generate/${interview_id}`);
  return response.data;
}

/**
 * Get the status of feedback generation for an interview session.
 * @param interview_id - Interview session ID
 * @returns API response data
 */
export async function getFeedbackStatus(interview_id: string) {
  const response = await api.get(`/audio/status/${interview_id}`);
  return response.data;
}

/**
 * Get the generated feedback for an interview session.
 * @param interview_id - Interview session ID
 * @returns API response data
 */
export async function getFeedback(interview_id: string) {
  const response = await api.get(`/audio/feedback/${interview_id}`);
  return response.data;
}

/**
 * Fetch dashboard statistics for the current user.
 * @returns API response data
 */
export async function fetchDashboardStats() {
  const response = await api.get("/dashboard/stats");
  return response.data;
}

/**
 * Fetch the interview history for the current user.
 * @returns API response data
 */
export async function fetchInterviewHistory() {
  const response = await api.get("/dashboard/history");
  return response.data;
}

/**
 * Fetch the active preparation plan for the current user.
 * @returns API response data or null if not found
 */
export async function fetchActivePlan() {
  try {
    const response = await api.get("/dashboard/active-plan");

    // 404 means no active plan (not an error)
    if (response.status === 404) {
      return null;
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error("Error fetching active plan:", error);
    return null;
  }
}
