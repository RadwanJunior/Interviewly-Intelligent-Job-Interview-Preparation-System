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

export async function uploadAudio(audioBlob: Blob, filename: string) {
  const formData = new FormData();
  formData.append("file", audioBlob, filename);

  const response = await api.post("/audio/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function getAudioResult(jobId: string) {
  const response = await api.get(`/audio/result/${jobId}`);
  return response.data;
}
