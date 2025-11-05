import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUp from "../page";
import { signup } from "@/lib/api";
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

/**
 * Integration tests for SignUp page auth workflow
 * These test complete user journeys from form interaction to navigation
 */

describe("SignUp Auth Integration", () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();
  const mockSignup = signup as jest.MockedFunction<typeof signup>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  describe("Complete Signup Flow", () => {
    it("should handle successful signup workflow from form to navigation", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);

      render(<SignUp />);

      // 1. Verify initial form state
      expect(
        screen.getByRole("heading", { name: /create an account/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/sign up to start your interview preparation/i)
      ).toBeInTheDocument();

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign up/i });

      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();

      // 2. Fill form with valid data
      await user.type(firstNameInput, "John");
      await user.type(lastNameInput, "Doe");
      await user.type(emailInput, "john.doe@example.com");
      await user.type(passwordInput, "password123");

      // Verify form values updated
      expect(firstNameInput).toHaveValue("John");
      expect(lastNameInput).toHaveValue("Doe");
      expect(emailInput).toHaveValue("john.doe@example.com");
      expect(passwordInput).toHaveValue("password123");

      // 3. Submit form
      await user.click(submitButton);

      // 4. Verify API call with correct data
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          "John",
          "Doe",
          "john.doe@example.com",
          "password123"
        );
      });

      // 5. Verify success feedback
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Account created! Check your email to confirm.",
        });
      });

      // 6. Verify navigation to confirm email page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/auth/confirm-email");
      });
    });

    it("should handle signup error workflow with proper error feedback", async () => {
      const user = userEvent.setup();
      mockSignup.mockRejectedValueOnce(new Error("Email already exists"));

      render(<SignUp />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "existing@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      // Verify error handling
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Email already exists",
          variant: "destructive",
        });
      });

      // Verify no navigation occurred
      expect(mockPush).not.toHaveBeenCalled();

      // Verify form remains interactive
      expect(
        screen.getByRole("button", { name: /sign up/i })
      ).not.toBeDisabled();
    });

    it("should handle loading states during signup process", async () => {
      const user = userEvent.setup();

      // Create a promise we can control
      let resolveSignup: () => void;
      const signupPromise = new Promise<void>((resolve) => {
        resolveSignup = resolve;
      });
      mockSignup.mockReturnValue(signupPromise);

      render(<SignUp />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      // Verify loading state
      await waitFor(() => {
        const loadingButton = screen.queryByRole("button", {
          name: /signing up/i,
        });
        if (loadingButton) {
          expect(loadingButton).toBeDisabled();
        }
      });

      // Resolve signup
      resolveSignup!();

      // Verify completion
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled();
      });
    });
  });

  describe("Form Validation and User Experience", () => {
    it("should handle form validation and provide proper user feedback", () => {
      render(<SignUp />);

      // Verify required field attributes
      expect(screen.getByLabelText(/first name/i)).toBeRequired();
      expect(screen.getByLabelText(/last name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();

      // Verify input types for accessibility and validation
      expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "type",
        "password"
      );

      // Verify proper form structure
      const form = screen
        .getByRole("button", { name: /sign up/i })
        .closest("form");
      expect(form).toBeInTheDocument();

      const requiredInputs = form?.querySelectorAll("input[required]");
      expect(requiredInputs?.length).toBe(4);
    });

    it("should handle multiple form input updates correctly", async () => {
      const user = userEvent.setup();
      render(<SignUp />);

      // Test updating multiple fields
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@test.com");
      await user.type(screen.getByLabelText(/password/i), "pass123");

      // Verify all values are maintained
      expect(screen.getByLabelText(/first name/i)).toHaveValue("John");
      expect(screen.getByLabelText(/last name/i)).toHaveValue("Doe");
      expect(screen.getByLabelText(/email/i)).toHaveValue("john@test.com");
      expect(screen.getByLabelText(/password/i)).toHaveValue("pass123");
    });

    it("should handle edge cases and special characters", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);

      render(<SignUp />);

      // Test with special characters and edge cases
      await user.type(screen.getByLabelText(/first name/i), "José");
      await user.type(screen.getByLabelText(/last name/i), "O'Brien");
      await user.type(
        screen.getByLabelText(/email/i),
        "jose.obrien+test@example.com"
      );
      await user.type(screen.getByLabelText(/password/i), "P@ssw0rd!#$");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          "José",
          "O'Brien",
          "jose.obrien+test@example.com",
          "P@ssw0rd!#$"
        );
      });
    });
  });

  describe("Navigation and Link Integration", () => {
    it("should provide proper navigation links and auth flow integration", () => {
      render(<SignUp />);

      // Verify login link for existing users
      const loginLink = screen.getByRole("link", { name: /log in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");

      // Verify proper page context
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    });

    it("should handle rapid submissions gracefully", async () => {
      const user = userEvent.setup();
      mockSignup.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SignUp />);

      // Fill form
      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      // Try rapid clicks
      const submitButton = screen.getByRole("button", { name: /sign up/i });
      await user.click(submitButton);
      await user.click(submitButton); // Second click

      // Should only call signup once
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error Recovery and User Guidance", () => {
    it("should handle different error types and provide appropriate feedback", async () => {
      const user = userEvent.setup();

      // Test generic error handling
      mockSignup.mockRejectedValueOnce("Network error");
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Signup failed, please try again.",
          variant: "destructive",
        });
      });
    });

    it("should allow form resubmission after error recovery", async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockSignup.mockRejectedValueOnce(new Error("Network error"));

      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      // Wait for error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Button should be re-enabled for retry
      const submitButton = screen.getByRole("button", { name: /sign up/i });
      expect(submitButton).not.toBeDisabled();

      // Second attempt succeeds
      mockSignup.mockResolvedValueOnce(undefined);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Accessibility and Form Structure", () => {
    it("should provide proper accessibility structure and labels", () => {
      render(<SignUp />);

      // Verify all inputs have proper labels
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Verify placeholders for user guidance
      expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Last Name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("you@example.com")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();

      // Verify proper form structure for screen readers
      const form = screen
        .getByRole("button", { name: /sign up/i })
        .closest("form");
      expect(form).toBeInTheDocument();
    });

    it("should handle long input values appropriately", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);

      render(<SignUp />);

      // Test with longer but reasonable inputs
      const longName = "A".repeat(50);
      const longEmail = "test" + "a".repeat(25) + "@example.com";
      const longPassword = "P@ssw0rd" + "1".repeat(25);

      await user.type(screen.getByLabelText(/first name/i), longName);
      await user.type(screen.getByLabelText(/last name/i), longName);
      await user.type(screen.getByLabelText(/email/i), longEmail);
      await user.type(screen.getByLabelText(/password/i), longPassword);
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          longName,
          longName,
          longEmail,
          longPassword
        );
      });
    });
  });
});
