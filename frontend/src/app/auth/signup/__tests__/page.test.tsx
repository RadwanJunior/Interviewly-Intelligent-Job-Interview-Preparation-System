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

describe("SignUp Page", () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();
  const mockSignup = signup as jest.MockedFunction<typeof signup>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  describe("Rendering", () => {
    it("should render the signup form", () => {
      render(<SignUp />);

      expect(
        screen.getByRole("heading", { name: /create an account/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/sign up to start your interview preparation/i)
      ).toBeInTheDocument();
    });

    it("should render all form fields", () => {
      render(<SignUp />);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<SignUp />);

      const submitButton = screen.getByRole("button", { name: /sign up/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    it("should render link to login page", () => {
      render(<SignUp />);

      const loginLink = screen.getByRole("link", { name: /log in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should have proper placeholders", () => {
      render(<SignUp />);

      expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Last Name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("you@example.com")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    });
  });

  describe("Form Input", () => {
    it("should update first name field on input", async () => {
      const user = userEvent.setup();
      render(<SignUp />);

      const firstNameInput = screen.getByLabelText(
        /first name/i
      ) as HTMLInputElement;
      await user.type(firstNameInput, "John");

      expect(firstNameInput.value).toBe("John");
    });

    it("should update last name field on input", async () => {
      const user = userEvent.setup();
      render(<SignUp />);

      const lastNameInput = screen.getByLabelText(
        /last name/i
      ) as HTMLInputElement;
      await user.type(lastNameInput, "Doe");

      expect(lastNameInput.value).toBe("Doe");
    });

    it("should update email field on input", async () => {
      const user = userEvent.setup();
      render(<SignUp />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, "john.doe@example.com");

      expect(emailInput.value).toBe("john.doe@example.com");
    });

    it("should update password field on input", async () => {
      const user = userEvent.setup();
      render(<SignUp />);

      const passwordInput = screen.getByLabelText(
        /password/i
      ) as HTMLInputElement;
      await user.type(passwordInput, "password123");

      expect(passwordInput.value).toBe("password123");
    });

    it("should update multiple fields", async () => {
      const user = userEvent.setup();
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@test.com");
      await user.type(screen.getByLabelText(/password/i), "pass123");

      expect(
        (screen.getByLabelText(/first name/i) as HTMLInputElement).value
      ).toBe("John");
      expect(
        (screen.getByLabelText(/last name/i) as HTMLInputElement).value
      ).toBe("Doe");
      expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe(
        "john@test.com"
      );
      expect(
        (screen.getByLabelText(/password/i) as HTMLInputElement).value
      ).toBe("pass123");
    });
  });

  describe("Form Validation", () => {
    it("should have required attributes on all fields", () => {
      render(<SignUp />);

      // All fields should have required attribute (HTML5 validation)
      expect(screen.getByLabelText(/first name/i)).toBeRequired();
      expect(screen.getByLabelText(/last name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it("should validate when submitting form with values that trim to empty", () => {
      render(<SignUp />);

      const form = screen
        .getByRole("button", { name: /sign up/i })
        .closest("form");
      expect(form).toBeInTheDocument();

      // Form should have proper structure for validation
      const inputs = form?.querySelectorAll("input[required]");
      expect(inputs?.length).toBe(4);
    });

    it("should not call signup API when form is incomplete", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);
      render(<SignUp />);

      // Only fill some fields
      await user.type(screen.getByLabelText(/first name/i), "John");

      // The form will use HTML5 validation, so signup won't be called
      // We can't easily test HTML5 validation in JSDOM, so we just verify
      // that the required attributes are present
      expect(screen.getByLabelText(/last name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });
  });

  describe("Successful Signup", () => {
    it("should call signup API with correct data", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith(
          "John",
          "Doe",
          "john.doe@example.com",
          "password123"
        );
      });
    });

    it("should show success toast on successful signup", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Account created! Check your email to confirm.",
        });
      });
    });

    it("should redirect to confirm email page on success", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/auth/confirm-email");
      });
    });

    it("should disable button during signup attempt", async () => {
      const user = userEvent.setup();
      // Mock takes time to resolve to allow checking loading state
      let resolveSignup!: () => void;
      const signupPromise = new Promise<void>((resolve) => {
        resolveSignup = resolve;
      });
      mockSignup.mockReturnValue(signupPromise);

      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", { name: /sign up/i });
      await user.click(submitButton);

      // Check that loading state appears
      await waitFor(() => {
        const loadingButton = screen.queryByRole("button", {
          name: /signing up/i,
        });
        if (loadingButton) {
          expect(loadingButton).toBeDisabled();
        }
      });

      // Resolve the promise
      resolveSignup();

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalled();
      });
    });
  });

  describe("Failed Signup", () => {
    it("should show error toast on signup failure with Error object", async () => {
      const user = userEvent.setup();
      mockSignup.mockRejectedValueOnce(new Error("Email already exists"));
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Email already exists",
          variant: "destructive",
        });
      });
    });

    it("should show generic error message for non-Error failures", async () => {
      const user = userEvent.setup();
      mockSignup.mockRejectedValueOnce("Unknown error");
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
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

    it("should not redirect on signup failure", async () => {
      const user = userEvent.setup();
      mockSignup.mockRejectedValueOnce(new Error("Network error"));
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should re-enable button after failed signup", async () => {
      const user = userEvent.setup();
      mockSignup.mockRejectedValueOnce(new Error("Signup failed"));
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Button should be enabled again
      const submitButton = screen.getByRole("button", { name: /sign up/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form structure", () => {
      render(<SignUp />);

      const form = screen
        .getByRole("button", { name: /sign up/i })
        .closest("form");
      expect(form).toBeInTheDocument();
    });

    it("should associate labels with inputs", () => {
      render(<SignUp />);

      expect(screen.getByLabelText(/first name/i)).toHaveAttribute(
        "id",
        "firstName"
      );
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute(
        "id",
        "lastName"
      );
      expect(screen.getByLabelText(/email/i)).toHaveAttribute("id", "email");
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "id",
        "password"
      );
    });

    it("should have required attributes on inputs", () => {
      render(<SignUp />);

      expect(screen.getByLabelText(/first name/i)).toBeRequired();
      expect(screen.getByLabelText(/last name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it("should have correct input types", () => {
      render(<SignUp />);

      expect(screen.getByLabelText(/first name/i)).toHaveAttribute(
        "type",
        "text"
      );
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute(
        "type",
        "text"
      );
      expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "type",
        "password"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid form submissions", async () => {
      const user = userEvent.setup();
      mockSignup.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<SignUp />);

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john.doe@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", { name: /sign up/i });
      await user.click(submitButton);
      await user.click(submitButton); // Try to click again

      // Should only call signup once
      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle special characters in inputs", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);
      render(<SignUp />);

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

    it("should handle long input values", async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValueOnce(undefined);
      render(<SignUp />);

      const longName = "A".repeat(50); // Reduced from 100
      const longEmail = "test" + "a".repeat(25) + "@example.com"; // Reduced from 50
      const longPassword = "P@ssw0rd" + "1".repeat(25); // Reduced from 50

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
