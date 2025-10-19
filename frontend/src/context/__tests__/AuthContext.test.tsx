/**
 * Tests for AuthContext
 * Tests authentication state management, login, logout, and token refresh
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";

// Mock the API module
jest.mock("@/lib/api");

const mockedApi = api as jest.Mocked<typeof api>;

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useAuth hook", () => {
    it("throws error when used outside AuthProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });

    it("provides auth context when used inside AuthProvider", () => {
      mockedApi.refreshToken.mockResolvedValue({ user: null });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current).toHaveProperty("user");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("loginUser");
      expect(result.current).toHaveProperty("logoutUser");
    });
  });

  describe("initialization", () => {
    it("starts with loading state", () => {
      mockedApi.refreshToken.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
    });

    it("attempts to refresh token on mount", async () => {
      mockedApi.refreshToken.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockedApi.refreshToken).toHaveBeenCalledTimes(1);
      expect(result.current.user).toEqual({
        id: "user-123",
        email: "test@example.com",
      });
    });

    it("sets user to null if refresh token fails", async () => {
      mockedApi.refreshToken.mockRejectedValue(new Error("Token expired"));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
    });
  });

  describe("loginUser", () => {
    it("successfully logs in user", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockedApi.refreshToken.mockResolvedValue({ user: null });
      mockedApi.login.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call loginUser wrapped in act
      await act(async () => {
        await result.current.loginUser("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockedApi.login).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    it("handles login errors gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockedApi.refreshToken.mockResolvedValue({ user: null });
      mockedApi.login.mockRejectedValue(new Error("Invalid credentials"));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call loginUser wrapped in act
      await act(async () => {
        await result.current.loginUser("wrong@example.com", "wrongpass");
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("logoutUser", () => {
    it("successfully logs out user", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockedApi.refreshToken.mockResolvedValue({ user: mockUser });
      mockedApi.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for user to be set
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Call logoutUser wrapped in act
      await act(async () => {
        await result.current.logoutUser();
      });

      await waitFor(() => {
        expect(result.current.user).toBe(null);
      });

      expect(mockedApi.logout).toHaveBeenCalledTimes(1);
    });

    it("handles logout errors gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockedApi.refreshToken.mockResolvedValue({ user: mockUser });
      mockedApi.logout.mockRejectedValue(new Error("Logout failed"));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for user to be set
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Call logoutUser wrapped in act
      await act(async () => {
        await result.current.logoutUser();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
