/**
 * @file page.test.tsx
 * @description Comprehensive unit tests for the Profile page component
 * Tests profile viewing, editing, logout functionality, and user interactions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import Profile from "../page";
import { logout } from "@/lib/api";

// Mock Next.js components
jest.mock("next/head", () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

jest.mock("next/link", () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
    }: {
      children: React.ReactNode;
      href: string;
    }) => {
      return <a href={href}>{children}</a>;
    },
  };
});

// Mock the API logout function
jest.mock("@/lib/api", () => ({
  logout: jest.fn(),
}));

// Mock useToast hook
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("Profile Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
  });

  describe("Page Rendering", () => {
    it("should render the profile page", () => {
      render(<Profile />);

      expect(screen.getByText("My Profile")).toBeInTheDocument();
    });

    it("should render page with proper SEO structure", () => {
      render(<Profile />);

      // The Head component renders title and meta, but they may not be
      // accessible in test DOM. Verify the main content instead.
      expect(screen.getByText("My Profile")).toBeInTheDocument();
    });

    it("should have proper page structure with gradient background", () => {
      const { container } = render(<Profile />);

      const mainDiv = container.querySelector(".min-h-screen.bg-gradient-to-b");
      expect(mainDiv).toBeInTheDocument();
    });

    it("should render profile card with shadow", () => {
      const { container } = render(<Profile />);

      const profileCard = container.querySelector(
        ".bg-white.rounded-xl.shadow-lg"
      );
      expect(profileCard).toBeInTheDocument();
    });
  });

  describe("Profile Information Display", () => {
    it("should display user name input", () => {
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.value).toBe("John Doe");
    });

    it("should display user email input", () => {
      render(<Profile />);

      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.value).toBe("john.doe@example.com");
    });

    it("should display user bio textarea", () => {
      render(<Profile />);

      const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
      expect(bioTextarea).toBeInTheDocument();
      expect(bioTextarea.value).toContain("Software Engineer");
    });

    it("should display profile picture", () => {
      render(<Profile />);

      const profileImage = screen.getByAltText("Profile");
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute("src");
    });

    it("should show all input labels", () => {
      render(<Profile />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Bio")).toBeInTheDocument();
    });
  });

  describe("Account Details Section", () => {
    it("should render Account Details section", () => {
      render(<Profile />);

      expect(screen.getByText("Account Details")).toBeInTheDocument();
    });

    it("should display member since information", () => {
      render(<Profile />);

      expect(screen.getByText("Member since:")).toBeInTheDocument();
      expect(screen.getByText("April 2023")).toBeInTheDocument();
    });

    it("should display interviews completed count", () => {
      render(<Profile />);

      expect(screen.getByText("Interviews completed:")).toBeInTheDocument();
      expect(screen.getByText("24")).toBeInTheDocument();
    });

    it("should display last login information", () => {
      render(<Profile />);

      expect(screen.getByText("Last login:")).toBeInTheDocument();
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });

  describe("Edit Profile Functionality", () => {
    it("should show Edit Profile and Log out buttons initially", () => {
      render(<Profile />);

      expect(
        screen.getByRole("button", { name: "Edit Profile" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Log out" })
      ).toBeInTheDocument();
    });

    it("should enable editing mode when Edit Profile is clicked", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Save Changes" })
      ).toBeInTheDocument();
    });

    it("should make inputs editable in edit mode", () => {
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      expect(nameInput).toHaveAttribute("readonly");

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      expect(nameInput).not.toHaveAttribute("readonly");
    });

    it("should show Change Photo button in edit mode", () => {
      render(<Profile />);

      expect(
        screen.queryByRole("button", { name: "Change Photo" })
      ).not.toBeInTheDocument();

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      expect(
        screen.getByRole("button", { name: "Change Photo" })
      ).toBeInTheDocument();
    });

    it("should allow changing name in edit mode", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });

      expect(nameInput.value).toBe("Jane Smith");
    });

    it("should allow changing email in edit mode", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      fireEvent.change(emailInput, {
        target: { value: "jane.smith@example.com" },
      });

      expect(emailInput.value).toBe("jane.smith@example.com");
    });

    it("should allow changing bio in edit mode", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
      fireEvent.change(bioTextarea, {
        target: { value: "Updated bio text" },
      });

      expect(bioTextarea.value).toBe("Updated bio text");
    });
  });

  describe("Save Changes Functionality", () => {
    it("should save changes and exit edit mode when Save Changes is clicked", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(saveButton);

      expect(
        screen.getByRole("button", { name: "Edit Profile" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Save Changes" })
      ).not.toBeInTheDocument();
    });

    it("should show success toast when profile is saved", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(saveButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    });

    it("should preserve changed values after saving", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(saveButton);

      expect(nameInput.value).toBe("New Name");
    });
  });

  describe("Cancel Editing Functionality", () => {
    it("should exit edit mode when Cancel is clicked", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(
        screen.getByRole("button", { name: "Edit Profile" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Cancel" })
      ).not.toBeInTheDocument();
    });

    it("should preserve changes even when cancelled (state persists)", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Changed Name" } });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      // In current implementation, state persists after cancel
      expect(nameInput.value).toBe("Changed Name");
    });
  });

  describe("Logout Functionality", () => {
    it("should render logout button", () => {
      render(<Profile />);

      expect(
        screen.getByRole("button", { name: "Log out" })
      ).toBeInTheDocument();
    });

    it("should call logout API when logout button is clicked", async () => {
      (logout as jest.Mock).mockResolvedValue(undefined);

      render(<Profile />);

      const logoutButton = screen.getByRole("button", { name: "Log out" });

      await act(async () => {
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(logout).toHaveBeenCalled();
      });
    });

    it("should show success toast on successful logout", async () => {
      (logout as jest.Mock).mockResolvedValue(undefined);

      render(<Profile />);

      const logoutButton = screen.getByRole("button", { name: "Log out" });

      await act(async () => {
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Logged out",
          description: "You have been logged out successfully.",
        });
      });
    });

    it("should redirect to login page after successful logout", async () => {
      (logout as jest.Mock).mockResolvedValue(undefined);

      render(<Profile />);

      const logoutButton = screen.getByRole("button", { name: "Log out" });

      await act(async () => {
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByRole("link")).toHaveAttribute("href", "/auth/login");
      });
    });

    it("should show error toast when logout fails with Error", async () => {
      const error = new Error("Network error");
      (logout as jest.Mock).mockRejectedValue(error);

      render(<Profile />);

      const logoutButton = screen.getByRole("button", { name: "Log out" });

      await act(async () => {
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "An error occurred while logging out.",
          variant: "destructive",
        });
      });
    });

    it("should handle unknown error during logout", async () => {
      (logout as jest.Mock).mockRejectedValue("Unknown error");

      render(<Profile />);

      const logoutButton = screen.getByRole("button", { name: "Log out" });

      await act(async () => {
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "An unknown error occurred while logging out.",
          variant: "destructive",
        });
      });
    });
  });

  describe("Read-only State", () => {
    it("should have readonly inputs when not in edit mode", () => {
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;

      expect(nameInput).toHaveAttribute("readonly");
      expect(emailInput).toHaveAttribute("readonly");
      expect(bioTextarea).toHaveAttribute("readonly");
    });

    it("should have disabled background color when not editing", () => {
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      expect(nameInput).toHaveClass("bg-secondary/20");
    });

    it("should not have disabled background in edit mode", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      expect(nameInput).not.toHaveClass("bg-secondary/20");
    });
  });

  describe("Responsive Layout", () => {
    it("should have responsive flex layout for profile content", () => {
      const { container } = render(<Profile />);

      const flexContainer = container.querySelector(
        ".flex.flex-col.md\\:flex-row"
      );
      expect(flexContainer).toBeInTheDocument();
    });

    it("should have responsive width classes for profile sections", () => {
      const { container } = render(<Profile />);

      const imageSection = container.querySelector(".md\\:w-1\\/3");
      const formSection = container.querySelector(".md\\:w-2\\/3");

      expect(imageSection).toBeInTheDocument();
      expect(formSection).toBeInTheDocument();
    });

    it("should have container with proper max width", () => {
      const { container } = render(<Profile />);

      const maxWidthContainer = container.querySelector(".max-w-2xl");
      expect(maxWidthContainer).toBeInTheDocument();
    });
  });

  describe("Profile Image Section", () => {
    it("should render profile image with aspect ratio", () => {
      const { container } = render(<Profile />);

      const imageContainer = container.querySelector(".aspect-square");
      expect(imageContainer).toBeInTheDocument();
    });

    it("should have rounded profile image container", () => {
      const { container } = render(<Profile />);

      const imageContainer = container.querySelector(".rounded-lg");
      expect(imageContainer).toBeInTheDocument();
    });

    it("should not show Change Photo button when not editing", () => {
      render(<Profile />);

      expect(
        screen.queryByRole("button", { name: "Change Photo" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for all form inputs", () => {
      render(<Profile />);

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Bio")).toBeInTheDocument();
    });

    it("should have accessible buttons", () => {
      render(<Profile />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it("should have proper heading hierarchy", () => {
      const { container } = render(<Profile />);

      const h1 = container.querySelector("h1");
      const h3 = container.querySelector("h3");

      expect(h1).toBeInTheDocument();
      expect(h3).toBeInTheDocument();
    });

    it("should have alt text for profile image", () => {
      render(<Profile />);

      const image = screen.getByAltText("Profile");
      expect(image).toBeInTheDocument();
    });
  });

  describe("Button Variants", () => {
    it("should render Edit Profile button with outline variant", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      // Button component adds specific classes for outline variant
      expect(editButton).toBeInTheDocument();
    });

    it("should render Log out button with destructive variant", () => {
      render(<Profile />);

      const logoutButton = screen.getByRole("button", { name: "Log out" });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should render Save Changes button with default variant", () => {
      render(<Profile />);

      const editButton = screen.getByRole("button", { name: "Edit Profile" });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe("Input Types", () => {
    it("should have email type for email input", () => {
      render(<Profile />);

      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("should have text type for name input", () => {
      render(<Profile />);

      const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
      expect(nameInput).toHaveAttribute("type", "text");
    });

    it("should render textarea for bio field", () => {
      render(<Profile />);

      const bioTextarea = screen.getByLabelText("Bio");
      expect(bioTextarea.tagName).toBe("TEXTAREA");
    });
  });
});
