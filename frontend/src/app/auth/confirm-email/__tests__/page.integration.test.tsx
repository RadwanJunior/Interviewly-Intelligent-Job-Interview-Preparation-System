import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmEmail from "../page";
import { refreshToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Mock dependencies
jest.mock("@/lib/api");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

/**
 * Integration tests for Confirm Email Page
 * Tests complete auth confirmation workflow and user experiences
 */
describe("Confirm Email Page Integration", () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();
  const mockRefreshToken = refreshToken as jest.MockedFunction<
    typeof refreshToken
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Complete Email Confirmation Workflow", () => {
    it("should handle successful email confirmation via manual check", async () => {
      const user = userEvent.setup({ delay: null });
      
      // Setup successful confirmation response
      mockRefreshToken.mockResolvedValueOnce({
        user: { id: "123", email: "test@example.com" },
      });

      render(<ConfirmEmail />);

      // 1. Verify initial render
      expect(screen.getByRole("heading", { name: /confirm your email/i })).toBeInTheDocument();
      expect(screen.getByText(/an email has been sent to your address/i)).toBeInTheDocument();
      expect(screen.getByText(/please click the confirmation link to activate your account/i)).toBeInTheDocument();

      const button = screen.getByRole("button", { name: /i have confirmed my email/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();

      // 2. User clicks manual check button
      await act(async () => {
        await user.click(button);
      });

      // 3. Verify API call made
      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      // 4. Verify success flow
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("should handle successful confirmation via automatic polling", async () => {
      // Setup polling responses: first unconfirmed, then confirmed
      mockRefreshToken
        .mockResolvedValueOnce({ user: null })
        .mockResolvedValueOnce({ user: null })
        .mockResolvedValueOnce({ user: { id: "456", email: "user@example.com" } });

      render(<ConfirmEmail />);

      // Verify initial state
      expect(screen.getByText(/confirm your email/i)).toBeInTheDocument();

      // 1. First poll (10 seconds) - not confirmed
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      // No redirect yet
      expect(mockToast).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      // 2. Second poll (20 seconds total) - still not confirmed
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });

      // 3. Third poll (30 seconds total) - confirmed!
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(mockRefreshToken).toHaveBeenCalledTimes(3);
    });

    it("should handle mixed manual and automatic checking workflow", async () => {
      const user = userEvent.setup({ delay: null });
      
      mockRefreshToken.mockResolvedValue({ user: null });

      render(<ConfirmEmail />);

      // 1. Manual check first
      const button = screen.getByRole("button", { name: /i have confirmed my email/i });
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      // Button re-enables after manual check
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /i have confirmed my email/i })).not.toBeDisabled();
      });

      // 2. Automatic polling continues
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });

      // 3. Another manual check
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /i have confirmed my email/i }));
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle network errors gracefully without breaking user experience", async () => {
      const user = userEvent.setup({ delay: null });
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      
      // Network error on manual check
      mockRefreshToken.mockRejectedValueOnce(new Error("Network error"));
      
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", { name: /i have confirmed my email/i });
      await act(async () => {
        await user.click(button);
      });

      // Error is logged but doesn't break UI
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error checking email confirmation:",
          expect.any(Error)
        );
      });

      // No success toast or redirect
      expect(mockToast).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      // Button re-enables after error
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /i have confirmed my email/i })).not.toBeDisabled();
      });

      // Polling continues despite manual error
      mockRefreshToken.mockResolvedValueOnce({ user: null });
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle polling errors without interrupting service", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      
      // First poll errors, second succeeds
      mockRefreshToken
        .mockRejectedValueOnce(new Error("Polling failed"))
        .mockResolvedValueOnce({ user: null })
        .mockResolvedValueOnce({ user: { id: "789" } });

      render(<ConfirmEmail />);

      // First poll - error
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error checking email confirmation:",
          expect.any(Error)
        );
      });

      // Second poll - recovers
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });

      // Third poll - success
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle edge cases in API responses", async () => {
      const user = userEvent.setup({ delay: null });

      // Test undefined response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRefreshToken.mockResolvedValueOnce(undefined as any);
      
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", { name: /i have confirmed my email/i });
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });

      // No crash, no redirect
      expect(mockToast).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      // Test user without ID (but with other properties)
      mockRefreshToken.mockResolvedValueOnce({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: { email: "test@example.com" } as any,
      });

      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });
    });

    it("should prevent duplicate requests during manual checking", async () => {
      const user = userEvent.setup({ delay: null });
      
      // Slow response to test race conditions
      mockRefreshToken.mockImplementation(
        () => new Promise((resolve) => 
          setTimeout(() => resolve({ user: null }), 200)
        )
      );

      render(<ConfirmEmail />);

      const button = screen.getByRole("button", { name: /i have confirmed my email/i });
      
      // Rapid clicks
      await act(async () => {
        await user.click(button);
        // Try to click again while first request is pending
        const checkingButton = screen.getByRole("button", { name: /checking/i });
        expect(checkingButton).toBeDisabled();
        await user.click(checkingButton); // Should be ignored
      });

      // Only one request should be made despite multiple clicks
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("User Experience and Accessibility", () => {
    it("should provide clear visual feedback for all user interactions", async () => {
      const user = userEvent.setup({ delay: null });
      
      mockRefreshToken.mockImplementation(
        () => new Promise((resolve) => 
          setTimeout(() => resolve({ user: null }), 100)
        )
      );

      render(<ConfirmEmail />);

      // 1. Initial state feedback
      const initialButton = screen.getByRole("button", { name: /i have confirmed my email/i });
      expect(initialButton).not.toBeDisabled();
      expect(initialButton).toHaveAccessibleName(/i have confirmed my email/i);

      // 2. Loading state feedback
      await act(async () => {
        await user.click(initialButton);
      });

      const loadingButton = screen.getByRole("button", { name: /checking/i });
      expect(loadingButton).toBeDisabled();
      expect(loadingButton).toHaveAccessibleName(/checking/i);

      // 3. Return to initial state
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        const resetButton = screen.getByRole("button", { name: /i have confirmed my email/i });
        expect(resetButton).not.toBeDisabled();
      });
    });

    it("should maintain proper semantic structure and accessibility", async () => {
      const { container } = render(<ConfirmEmail />);

      // Semantic structure
      expect(screen.getByRole("heading", { name: /confirm your email/i })).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();

      // Layout accessibility
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
      expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
      expect(container.querySelector(".text-center")).toBeInTheDocument();

      // Heading hierarchy
      const heading = screen.getByRole("heading", { name: /confirm your email/i });
      expect(heading.tagName).toBe("H2");
    });

    it("should handle component lifecycle properly", async () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      // Mount component
      const { unmount } = render(<ConfirmEmail />);

      // Interval should be set up
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

      // Unmount component
      unmount();

      // Interval should be cleaned up
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it("should handle sustained polling without memory leaks", async () => {
      mockRefreshToken.mockResolvedValue({ user: null });
      
      render(<ConfirmEmail />);

      // Run extended polling session (5 minutes worth)
      const pollCycles = 30; // 30 cycles * 10 seconds = 5 minutes
      
      for (let i = 0; i < pollCycles; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000);
        });
      }

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(pollCycles);
      });

      // Component should still be responsive
      expect(screen.getByText(/confirm your email/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /i have confirmed my email/i })).not.toBeDisabled();
    });
  });

  describe("Integration with Auth Flow", () => {
    it("should work correctly as part of signup → confirm → dashboard flow", async () => {
      const user = userEvent.setup({ delay: null });
      
      // Simulate the flow: user just came from signup
      mockRefreshToken.mockResolvedValueOnce({
        user: { id: "new-user-123", email: "newuser@example.com" },
      });

      render(<ConfirmEmail />);

      // User sees confirmation page (as expected after signup)
      expect(screen.getByText(/confirm your email/i)).toBeInTheDocument();
      expect(screen.getByText(/an email has been sent to your address/i)).toBeInTheDocument();

      // User clicks after confirming email externally
      const button = screen.getByRole("button", { name: /i have confirmed my email/i });
      await act(async () => {
        await user.click(button);
      });

      // Successful redirect to dashboard (completing auth flow)
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard");

      // Verify the complete flow worked
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    });

    it("should handle returning users who are already confirmed", async () => {
      // User refreshes page or navigates back, but they're already confirmed
      mockRefreshToken.mockResolvedValue({
        user: { id: "existing-user", email: "existing@example.com" },
      });

      render(<ConfirmEmail />);

      // Automatic polling immediately detects confirmed user
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});