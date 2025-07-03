import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", // Change this for production
  withCredentials: true, // Ensures cookies (tokens) are sent
  headers: { "Content-Type": "application/json" },
});

console.log("API base URL:", api.defaults.baseURL);

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

export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", { email, password });
  // Do not set token from response because it is set as an HTTP-only cookie
  return response.data;
}

export async function refreshToken() {
  try {
    const response = await api.post("/auth/refresh", {});
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

export async function logout() {
  await api.post("/auth/logout");
}

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

export async function getResume() {
  const response = await api.get("/resumes/");
  return response.data;
}

export async function updateResume(updatedText: string) {
  const response = await api.put("/resumes/", {
    updated_text: updatedText,
  });
  return response.data;
}
export async function getResumeFromUser(userId: string) {
  const response = await api.get(`/resumes/${userId}`);
  return response.data;
}

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

export async function createInterviewSession(data: {
  job_description_id: string;
}) {
  const response = await api.post("/interview/create", data);
  return response.data;
}

export async function getInterviewStatus(sessionId: string) {
  const response = await api.get(`/interview/status/${sessionId}`);
  return response.data;
}

export async function getInterviewQuestions(sessionId: string) {
  const response = await api.get(`/interview/questions/${sessionId}`);
  return response.data;
}

// Upload an audio file for a question
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

// Manually trigger feedback generation
export async function triggerFeedbackGeneration(interview_id: string) {
  const response = await api.post(`/audio/generate/${interview_id}`);
  return response.data;
}

// Get feedback generation status
export async function getFeedbackStatus(interview_id: string) {
  const response = await api.get(`/audio/status/${interview_id}`);
  return response.data;
}

// Get generated feedback
export async function getFeedback(interview_id: string) {
  const response = await api.get(`/audio/feedback/${interview_id}`);
  return response.data;
}

export async function fetchDashboardStats() {
  const response = await api.get("/dashboard/stats");
  return response.data;
}

export async function fetchInterviewHistory() {
  const response = await api.get("/dashboard/history");
  return response.data;
}

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

export async function createPreparationPlan(planData) {
  const response = await api.post("/dashboard/preparation-plan", planData);
  return response.data;
}

export async function updatePreparationPlan(planId, updateData) {
  const response = await api.put(
    `/dashboard/preparation-plan/${planId}`,
    updateData
  );
  return response.data;
}
