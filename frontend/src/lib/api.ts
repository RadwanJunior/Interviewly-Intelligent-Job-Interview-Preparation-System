import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", // Change this for production
  withCredentials: true, // Ensures cookies (tokens) are sent
  headers: { "Content-Type": "application/json" },
});

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
