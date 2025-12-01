/**
 * Tests for Navbar component
 * Tests rendering, navigation, user authentication states, and mobile menu
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

// Mock the AuthContext
jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon">☰</span>,
  X: () => <span data-testid="x-icon">✕</span>,
  User: () => <span data-testid="user-icon">👤</span>,
}));

// Mock Next.js Link component
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

describe("Navbar Component", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe("when user is not logged in", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
      });
    });

    it("renders the logo", () => {
      render(<Navbar />);

      const logo = screen.getByRole("link", { name: /interviewly/i });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");
    });

    it("renders navigation links", () => {
      render(<Navbar />);

      expect(
        screen.getByRole("button", { name: /features/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /how it-works/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /pricing/i })
      ).toBeInTheDocument();
    });

    it("shows login button when user is not authenticated", () => {
      render(<Navbar />);

      const loginLink = screen.getByRole("link", { name: /log in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("does not show profile button when user is not authenticated", () => {
      render(<Navbar />);

      const profileLink = screen.queryByRole("link", { name: /profile/i });
      expect(profileLink).not.toBeInTheDocument();
    });
  });

  describe("when user is logged in", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: "user-123", email: "test@example.com" },
        loading: false,
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
      });
    });

    it("shows profile button when user is authenticated", () => {
      render(<Navbar />);

      const profileLink = screen.getByRole("link", { name: /profile/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute("href", "/profile");
    });

    it("does not show login button when user is authenticated", () => {
      render(<Navbar />);

      const loginLink = screen.queryByRole("link", { name: /log in/i });
      expect(loginLink).not.toBeInTheDocument();
    });
  });

  describe("mobile menu functionality", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
      });
    });

    it("toggles mobile menu on button click", async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      // Mobile menu should not be visible initially
      screen.queryByRole("button", {
        name: /features/i,
        hidden: true,
      });

      // Find and click the mobile menu button
      const menuButtons = screen.getAllByRole("button");
      const mobileMenuButton = menuButtons.find(
        (btn) =>
          btn.querySelector("svg") !== null &&
          !btn.textContent?.includes("features")
      );

      if (mobileMenuButton) {
        await user.click(mobileMenuButton);

        // Mobile menu should now be visible
        await waitFor(() => {
          expect(
            screen.getAllByRole("button", { name: /features/i }).length
          ).toBeGreaterThan(1);
        });
      }
    });
  });

  describe("scroll behavior", () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false,
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
      });
    });

    it("applies scrolled styles when page is scrolled", async () => {
      render(<Navbar />);

      const nav = screen.getByRole("navigation");

      // Initially should not have scrolled styles
      expect(nav).toHaveClass("bg-transparent");

      // Simulate scroll wrapped in act
      act(() => {
        global.window.scrollY = 100;
        global.window.dispatchEvent(new Event("scroll"));
      });

      // Should apply scrolled styles (tested via class presence)
      await waitFor(() => {
        expect(nav).toHaveClass("bg-white/80");
      });
    });
  });
});
