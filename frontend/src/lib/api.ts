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
    console.log("Refresh Token Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error refreshing token:",
      error.response?.data || error.message
    );
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

export async function createJobDescription(userId: string, jobTitle: string, companyName: string, location: string, jobType: string, description: string) {
  const response = await api.post("/api/job_description", {
    user_id: userId,
    job_title: jobTitle,
    company_name: companyName,
    location: location,
    job_type: jobType,
    description: description
  });
  return response.data;
}