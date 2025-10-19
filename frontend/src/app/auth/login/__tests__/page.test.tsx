/**
 * Tests for Login page
 * Tests form rendering, validation, submission, and error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogIn from "@/app/auth/login/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Mock dependencies
jest.mock("@/context/AuthContext");
jest.mock("next/navigation");
jest.mock("@/hooks/use-toast");
jest.mock("next/head", () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = "Link";
  return MockLink;
});

// Mock lucide-react icons (login page might use icons)
jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon">👁</span>,
  EyeOff: () => <span data-testid="eye-off-icon">🙈</span>,
  ArrowRight: () => <span data-testid="arrow-right-icon">→</span>,
}));

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockLoginUser = jest.fn();

describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      loginUser: mockLoginUser,
      logoutUser: jest.fn(),
    });
  });

  it("renders the login form", () => {
    render(<LogIn />);

    expect(
      screen.getByRole("heading", { name: /welcome back/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("updates form fields when user types", async () => {
    const user = userEvent.setup();
    render(<LogIn />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("validates form has required fields", () => {
    render(<LogIn />);

    // Check that form inputs have required attribute
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute("required");
    expect(passwordInput).toHaveAttribute("required");
    expect(emailInput).toHaveAttribute("type", "email");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("successfully submits login form", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockResolvedValue(undefined);

    render(<LogIn />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /log in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Login successful!",
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("handles login errors", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockRejectedValue(new Error("Invalid credentials"));

    render(<LogIn />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /log in/i });

    await user.type(emailInput, "wrong@example.com");
    await user.type(passwordInput, "wrongpassword");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Invalid credentials",
        variant: "destructive",
      });
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    mockLoginUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<LogIn />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /log in/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it("renders sign up link", () => {
    render(<LogIn />);

    const signUpLink = screen.getByRole("link", { name: /sign up/i });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute("href", "/auth/signup");
  });
});
