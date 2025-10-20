import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmEmail from "../page";
import { refreshToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Mock the dependencies
jest.mock("@/lib/api");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

// Mock timers
jest.useFakeTimers();

describe("ConfirmEmail Page", () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();
  const mockRefreshToken = refreshToken as jest.MockedFunction<
    typeof refreshToken
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Rendering", () => {
    it("should render the confirm email page", () => {
      render(<ConfirmEmail />);

      expect(
        screen.getByRole("heading", { name: /confirm your email/i })
      ).toBeInTheDocument();
    });

    it("should display instruction text", () => {
      render(<ConfirmEmail />);

      expect(
        screen.getByText(/an email has been sent to your address/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /please click the confirmation link to activate your account/i
        )
      ).toBeInTheDocument();
    });

    it("should render confirmation button", () => {
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it("should have proper layout structure", () => {
      const { container } = render(<ConfirmEmail />);

      // Check for centered layout classes
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
      expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
    });
  });

  describe("Manual Email Check", () => {
    it("should call refreshToken when button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockResolvedValueOnce({ user: null });
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });
    });

    it("should show checking state when button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /checking/i })
        ).toBeDisabled();
      });
    });

    it("should redirect to dashboard if user is confirmed", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockResolvedValueOnce({
        user: { id: "123", email: "test@example.com" },
      });
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("should not redirect if user is not confirmed", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockResolvedValueOnce({ user: null });
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });

      expect(mockToast).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should re-enable button after check completes", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockResolvedValueOnce({ user: null });
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });

      // Wait a bit for state to update
      await waitFor(() => {
        const updatedButton = screen.queryByRole("button", {
          name: /checking/i,
        });
        expect(updatedButton).not.toBeInTheDocument();
      });

      // Button should be enabled again with original text
      const enabledButton = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      expect(enabledButton).not.toBeDisabled();
    });

    it("should handle errors gracefully when checking fails", async () => {
      const user = userEvent.setup({ delay: null });
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockRefreshToken.mockRejectedValueOnce(new Error("Network error"));
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });

      expect(consoleError).toHaveBeenCalledWith(
        "Error checking email confirmation:",
        expect.any(Error)
      );
      expect(mockToast).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("Automatic Polling", () => {
    it("should set up polling interval on mount", () => {
      const setIntervalSpy = jest.spyOn(global, "setInterval");
      render(<ConfirmEmail />);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
      setIntervalSpy.mockRestore();
    });

    it("should poll every 10 seconds", async () => {
      mockRefreshToken.mockResolvedValue({ user: null });
      render(<ConfirmEmail />);

      // Initial mount doesn't call immediately (only setInterval does)
      expect(mockRefreshToken).not.toHaveBeenCalled();

      // Advance by 10 seconds
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      // Advance by another 10 seconds
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });
    });

    it("should redirect to dashboard when polling detects confirmed email", async () => {
      mockRefreshToken.mockResolvedValueOnce({ user: null });
      mockRefreshToken.mockResolvedValueOnce({
        user: { id: "123", email: "test@example.com" },
      });
      render(<ConfirmEmail />);

      // First poll
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      // Second poll - user is now confirmed
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

    it("should clear interval on unmount", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");
      const { unmount } = render(<ConfirmEmail />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("should handle polling errors without breaking", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockRefreshToken.mockRejectedValueOnce(new Error("Network error"));
      mockRefreshToken.mockResolvedValueOnce({ user: null });
      render(<ConfirmEmail />);

      // First poll - error
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      expect(consoleError).toHaveBeenCalled();

      // Second poll - should still work
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });

      consoleError.mockRestore();
    });

    it("should continue polling even after manual check", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockResolvedValue({ user: null });
      render(<ConfirmEmail />);

      // Manual check
      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });

      // Polling should still work
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("User Experience", () => {
    it("should disable button during check to prevent double clicks", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ user: null }), 100)
          )
      );
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      // Try to click again while checking
      const checkingButton = screen.getByRole("button", { name: /checking/i });
      expect(checkingButton).toBeDisabled();

      // Try to click the disabled button
      await user.click(checkingButton);

      // Should only call refreshToken once
      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });
    });

    it("should show appropriate button text in different states", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ user: null }), 50)
          )
      );
      render(<ConfirmEmail />);

      // Initial state
      expect(
        screen.getByRole("button", { name: /i have confirmed my email/i })
      ).toBeInTheDocument();

      // Click button
      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      // Checking state
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /checking/i })
        ).toBeInTheDocument();
      });

      // Back to initial state after check
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /i have confirmed my email/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle refreshToken returning undefined", async () => {
      const user = userEvent.setup({ delay: null });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRefreshToken.mockResolvedValueOnce(undefined as any);
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalled();
      });

      expect(mockToast).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should handle refreshToken returning user without id", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockResolvedValueOnce({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: { email: "test@example.com" } as any,
      });
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Email confirmed",
          description: "You will now be redirected to your dashboard.",
        });
      });
    });

    it("should handle rapid button clicks", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ user: null }), 100)
          )
      );
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });

      // Try to click multiple times
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call once because button gets disabled
      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle multiple polling cycles without memory leaks", async () => {
      mockRefreshToken.mockResolvedValue({ user: null });
      render(<ConfirmEmail />);

      // Run multiple polling cycles
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000);
        });
      }

      await waitFor(() => {
        expect(mockRefreshToken).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<ConfirmEmail />);

      const heading = screen.getByRole("heading", {
        name: /confirm your email/i,
      });
      expect(heading.tagName).toBe("H2");
    });

    it("should have descriptive button text", () => {
      render(<ConfirmEmail />);

      const button = screen.getByRole("button");
      expect(button).toHaveAccessibleName(/i have confirmed my email/i);
    });

    it("should indicate button state to assistive technology", async () => {
      const user = userEvent.setup({ delay: null });
      mockRefreshToken.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ user: null }), 100)
          )
      );
      render(<ConfirmEmail />);

      const button = screen.getByRole("button", {
        name: /i have confirmed my email/i,
      });
      await user.click(button);

      const checkingButton = screen.getByRole("button", { name: /checking/i });
      expect(checkingButton).toBeDisabled();
    });
  });
});
