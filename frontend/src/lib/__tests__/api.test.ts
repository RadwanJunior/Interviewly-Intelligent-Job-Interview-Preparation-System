/**
 * Tests for API utilities
 * Tests HTTP requests, error handling, and data transformation
 */

// Mock axios BEFORE importing the api module with a factory function
jest.mock("axios", () => {
  // Create mock instance inside the factory
  const mockInstance = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: "http://localhost:8000",
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
      isAxiosError: jest.fn((error: unknown) => {
        return (
          error !== null &&
          typeof error === "object" &&
          "isAxiosError" in error &&
          error.isAxiosError === true
        );
      }),
    },
  };
});

import axios from "axios";
import {
  signup,
  login,
  refreshToken,
  logout,
  uploadResume,
  fetchDashboardStats,
} from "@/lib/api";

// Get the mock instance that was created
const mockAxiosInstance = (axios.create as jest.Mock)();

describe("API utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("successfully signs up a new user", async () => {
      const mockResponse = {
        data: {
          message: "User created successfully",
          user: { id: "user-new", email: "new@example.com" },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await signup(
        "John",
        "Doe",
        "new@example.com",
        "password123"
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/auth/signup", {
        firstName: "John",
        lastName: "Doe",
        email: "new@example.com",
        password: "password123",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("handles signup errors", async () => {
      const mockError = new Error("Email already exists");
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        signup("John", "Doe", "existing@example.com", "password123")
      ).rejects.toThrow("Email already exists");
    });
  });

  describe("login", () => {
    it("successfully logs in a user", async () => {
      const mockResponse = {
        data: {
          message: "Login successful",
          user: { id: "user-123", email: "test@example.com" },
          access_token: "mock-token",
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await login("test@example.com", "password123");

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("handles login errors", async () => {
      const mockError = new Error("Invalid credentials");
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(login("wrong@example.com", "wrongpass")).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });

  describe("refreshToken", () => {
    it("successfully refreshes token", async () => {
      const mockResponse = {
        data: {
          message: "Token refreshed",
          user: { id: "user-123", email: "test@example.com" },
          access_token: "new-token",
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await refreshToken();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/auth/refresh", {});
      expect(result).toEqual(mockResponse.data);
    });

    it("handles refresh token errors", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const mockError = new Error("Token expired");
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(refreshToken()).rejects.toThrow("Token expired");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("logout", () => {
    it("successfully logs out user", async () => {
      const mockResponse = {
        data: { message: "Logout successful" },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/auth/logout");
    });
  });

  describe("uploadResume", () => {
    it("successfully uploads a resume file", async () => {
      const mockFile = new File(["resume content"], "resume.pdf", {
        type: "application/pdf",
      });
      const mockResponse = {
        data: {
          message: "Resume uploaded successfully",
          resumeId: "resume-123",
          extractedText: "Mock extracted text",
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await uploadResume(mockFile);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/resumes/upload",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("handles upload errors", async () => {
      const mockFile = new File(["resume content"], "resume.pdf", {
        type: "application/pdf",
      });
      const mockError = new Error("File too large");
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(uploadResume(mockFile)).rejects.toThrow("File too large");
    });
  });

  describe("fetchDashboardStats", () => {
    it("successfully fetches dashboard statistics", async () => {
      const mockResponse = {
        data: {
          totalInterviews: 12,
          averageScore: 82,
          completedThisMonth: 5,
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await fetchDashboardStats();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/dashboard/stats");
      expect(result).toEqual(mockResponse.data);
    });

    it("handles fetch errors", async () => {
      const mockError = new Error("Network error");
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(fetchDashboardStats()).rejects.toThrow("Network error");
    });
  });
});
