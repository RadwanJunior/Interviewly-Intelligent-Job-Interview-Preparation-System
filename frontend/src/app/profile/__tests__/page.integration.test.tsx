import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Profile from "../page";
import { logout } from "@/lib/api";

// Mock Next.js modules
jest.mock("next/head", () => {
  return function Head({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock("next/link", () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock the logout function
jest.mock("@/lib/api", () => ({
  logout: jest.fn(),
}));

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("Profile Page Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
  });

  describe("Profile Display and Initial State", () => {
    it("should display complete profile information", () => {
      render(<Profile />);

      // Page title
      expect(screen.getByText("My Profile")).toBeInTheDocument();

      // Profile fields with default values
      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;

      expect(nameInput.value).toBe("John Doe");
      expect(emailInput.value).toBe("john.doe@example.com");
      expect(bioTextarea.value).toContain("Software Engineer");

      // Account details
      expect(screen.getByText("Account Details")).toBeInTheDocument();
      expect(screen.getByText("April 2023")).toBeInTheDocument();
      expect(screen.getByText("24")).toBeInTheDocument();
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("should show fields in read-only mode by default", () => {
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;

      // Fields have readonly attribute
      expect(nameInput).toHaveAttribute("readonly");
      expect(emailInput).toHaveAttribute("readonly");

      // Edit button visible, save/cancel hidden
      expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe("Profile Editing Workflow", () => {
    it("should enable editing mode and save changes", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;

      // Start editing
      await user.click(screen.getByRole("button", { name: /edit profile/i }));

      // Fields become editable
      expect(nameInput).not.toHaveAttribute("readonly");
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();

      // Make changes
      await user.clear(nameInput);
      await user.type(nameInput, "Jane Smith");

      // Save
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      // Success toast shown
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Profile updated",
          })
        );
      });

      // Back to read-only with new value
      expect(nameInput).toHaveAttribute("readonly");
      expect(nameInput.value).toBe("Jane Smith");
    });

    it("should cancel editing and exit edit mode", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;

      // Enter edit mode and make changes
      await user.click(screen.getByRole("button", { name: /edit profile/i }));
      await user.clear(nameInput);
      await user.type(nameInput, "Changed Name");

      // Cancel
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Back to read-only mode (note: changes persist in this implementation)
      expect(nameInput).toHaveAttribute("readonly");
      expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
    });

    it("should show change photo button only in edit mode", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Not visible initially
      expect(screen.queryByRole("button", { name: /change photo/i })).not.toBeInTheDocument();

      // Visible in edit mode
      await user.click(screen.getByRole("button", { name: /edit profile/i }));
      expect(screen.getByRole("button", { name: /change photo/i })).toBeInTheDocument();

      // Hidden again after cancel
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByRole("button", { name: /change photo/i })).not.toBeInTheDocument();
    });
  });

  describe("Logout Functionality", () => {
    it("should handle successful logout", async () => {
      const user = userEvent.setup();
      (logout as jest.Mock).mockResolvedValue({ success: true });
      render(<Profile />);

      await user.click(screen.getByRole("button", { name: /log out/i }));

      expect(logout).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Logged out",
          })
        );
      });
    });

    it("should handle logout errors", async () => {
      const user = userEvent.setup();
      (logout as jest.Mock).mockRejectedValue(new Error("Network error"));
      render(<Profile />);

      await user.click(screen.getByRole("button", { name: /log out/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error",
            variant: "destructive",
          })
        );
      });
    });

    it("should hide logout button in edit mode", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Logout visible initially
      expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();

      // Hidden in edit mode
      await user.click(screen.getByRole("button", { name: /edit profile/i }));
      expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
    });
  });

  describe("Button Behavior", () => {
    it("should toggle between edit and read-only button sets", async () => {
      const user = userEvent.setup();
      render(<Profile />);

      // Read-only: Edit Profile + Log out
      expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();

      // Click edit
      await user.click(screen.getByRole("button", { name: /edit profile/i }));

      // Edit mode: Cancel + Save Changes
      expect(screen.queryByRole("button", { name: /edit profile/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });
});
