import axios from "axios";

// Axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:8000", 
  withCredentials: true, 
  headers: { "Content-Type": "application/json" },
});

// User signup
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

// User login
export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", { email, password });
  return response.data; // Token handled via HTTP-only cookie
}

// Refresh authentication token
export async function refreshToken() {
  try {
    const response = await api.post("/auth/refresh", {});
    return response.data;
  } catch (error: any) {
    console.error("Error refreshing token:", error.response?.data || error.message);
    throw error;
  }
}

// User logout
export async function logout() {
  await api.post("/auth/logout");
}

// Upload a resume file
export async function uploadResume(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/resumes/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

// Fetch the user's resume
export async function getResume() {
  const response = await api.get("/resumes/");
  return response.data;
}

// Update resume text
export async function updateResume(updatedText: string) {
  const response = await api.put("/resumes/", { updated_text: updatedText });
  return response.data;
}

// Fetch a resume for a specific user
export async function getResumeFromUser(userId: string) {
  const response = await api.get(`/resumes/${userId}`);
  return response.data;
}

// Create a job description
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
