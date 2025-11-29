/**
 * api.ts - Centralized API utility for frontend HTTP requests
 * Provides functions for authentication, resume, job, interview, audio, and dashboard endpoints.
 * Uses Axios for HTTP requests and handles cookies/tokens as needed.
 */

import axios, { AxiosError, AxiosRequestConfig } from "axios";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = `${rawApiUrl.replace(/\/$/, "")}/api`;

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// refresh token handling state
let isRefreshing = false;
type FailedRequest = {
  resolve: (value?: string | null) => void;
  reject: (reason?: unknown) => void;
};
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

type RetryableRequest = AxiosRequestConfig & { _retry?: boolean };

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest;

    // Don't retry refresh token requests
    if (originalRequest?.url?.includes("/auth/refresh")) {
      console.error("Refresh token failed, session expired");
      isRefreshing = false;
      processQueue(error, null);
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshToken();
        processQueue(null, "success");
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

export const refreshToken = async () => {
  try {
    const response = await api.post("/auth/refresh");
    return response.data;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
};

export const signup = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
) => {
  try {
    const response = await api.post("/auth/signup", {
      firstName,
      lastName,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};

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
  type: "text" | "call";
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
  console.log(
    `DEBUG API: getFeedbackStatus called for interview_id: ${interview_id}`
  );
  try {
    const response = await api.get(`/audio/status/${interview_id}`);
    console.log(`DEBUG API: getFeedbackStatus response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`DEBUG API: getFeedbackStatus error:`, error);
    throw error;
  }
}

/**
 * Get the generated feedback for an interview session.
 * @param interview_id - Interview session ID
 * @returns API response data
 */
export async function getFeedback(interview_id: string) {
  console.log(
    `DEBUG API: getFeedback called for interview_id: ${interview_id}`
  );
  try {
    const response = await api.get(`/audio/feedback/${interview_id}`);
    console.log(`DEBUG API: getFeedback response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`DEBUG API: getFeedback error:`, error);
    throw error;
  }
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

/**
 * Create a new preparation plan for the dashboard.
 * @param planData - Preparation plan data object
 * @returns API response data
 */
export async function createPreparationPlan(planData: Record<string, unknown>) {
  const response = await api.post("/dashboard/preparation-plan", planData);
  return response.data;
}

/**
 * Update an existing preparation plan.
 * @param planId - Preparation plan ID
 * @param updateData - Data to update
 * @returns API response data
 */
export async function updatePreparationPlan(
  planId: string,
  updateData: Record<string, unknown>
) {
  const response = await api.put(
    `/dashboard/preparation-plan/${planId}`,
    updateData
  );
  return response.data;
}

// Add these helper functions

// Trigger live feedback generation
export async function triggerLiveFeedbackGeneration(interview_id: string) {
  const response = await api.post(
    `/live_feedback/generate_live_feedback/${interview_id}`
  );
  return response.data;
}

// Get live feedback generation status
export async function checkLiveFeedbackStatus(sessionId: string) {
  const response = await api.get(`/live_feedback/status/${sessionId}`);
  return response.data;
}

// Get generated live feedback
export async function getLiveFeedback(interview_id: string) {
  const response = await api.get(`/live_feedback/feedback/${interview_id}`);
  return response.data;
}

// Clear feedback status (for debugging)
export async function clearFeedbackStatus(interview_id: string) {
  console.log(
    `DEBUG API: clearFeedbackStatus called for interview_id: ${interview_id}`
  );
  try {
    const response = await api.delete(`/audio/status/${interview_id}`);
    console.log(`DEBUG API: clearFeedbackStatus response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`DEBUG API: clearFeedbackStatus error:`, error);
    throw error;
  }
}
