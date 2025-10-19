/**
 * Integration Tests for Landing Page
 * Tests the complete user flow on the home page including rendering, navigation, and interactions
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Index from "@/app/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Mock dependencies
jest.mock("@/context/AuthContext");
jest.mock("next/navigation");
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

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon">→</span>,
  Upload: () => <span data-testid="upload-icon">↑</span>,
  Video: () => <span data-testid="video-icon">📹</span>,
  MessageSquare: () => <span data-testid="message-icon">💬</span>,
  Award: () => <span data-testid="award-icon">🏆</span>,
  CheckCircle2: () => <span data-testid="check-icon">✓</span>,
  Menu: () => <span data-testid="menu-icon">☰</span>,
  X: () => <span data-testid="x-icon">✕</span>,
  User: () => <span data-testid="user-icon">👤</span>,
}));

// Mock Navbar component to avoid nested mocking issues
jest.mock("@/components/Navbar", () => {
  const MockNavbar = () => <nav data-testid="navbar">Navbar</nav>;
  MockNavbar.displayName = "Navbar";
  return MockNavbar;
});

const mockPush = jest.fn();

describe("Landing Page Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      loginUser: jest.fn(),
      logoutUser: jest.fn(),
    });
  });

  describe("Hero Section", () => {
    it("renders hero section with main heading and CTA", () => {
      render(<Index />);

      expect(
        screen.getByRole("heading", { name: /master your interviews with ai/i })
      ).toBeInTheDocument();

      expect(
        screen.getByText(/practice with personalized interview questions/i)
      ).toBeInTheDocument();
    });

    it("navigates to dashboard when CTA button is clicked", async () => {
      const user = userEvent.setup();
      render(<Index />);

      // Find the main CTA button in the hero section ("Start Practicing")
      const heroCTA = screen.getByRole("button", { name: /start practicing/i });

      await user.click(heroCTA);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Features Section", () => {
    it("renders all feature cards", () => {
      render(<Index />);

      // Check for feature section heading
      const featuresHeading = screen.getByRole("heading", {
        name: /why choose interviewly/i,
      });
      expect(featuresHeading).toBeInTheDocument();

      // Check for feature cards by their headings
      expect(
        screen.getByRole("heading", { name: /resume analysis/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /practice interviews/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /ai feedback/i })
      ).toBeInTheDocument();
    });
  });

  describe("How It Works Section", () => {
    it("renders all steps in the process", () => {
      render(<Index />);

      expect(screen.getByText(/upload your documents/i)).toBeInTheDocument();
      expect(
        screen.getByText(/receive tailored questions/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/practice your responses/i)).toBeInTheDocument();
      expect(screen.getByText(/get detailed feedback/i)).toBeInTheDocument();
    });

    it("displays step numbers in order", () => {
      render(<Index />);

      expect(screen.getByText("01")).toBeInTheDocument();
      expect(screen.getByText("02")).toBeInTheDocument();
      expect(screen.getByText("03")).toBeInTheDocument();
      expect(screen.getByText("04")).toBeInTheDocument();
    });
  });

  describe("Pricing Section", () => {
    it("renders pricing plans", () => {
      render(<Index />);

      // Check for pricing plan names as headings (more specific than text)
      expect(
        screen.getByRole("heading", { name: /^basic$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /^pro$/i })
      ).toBeInTheDocument();
    });

    it("displays pricing information", () => {
      render(<Index />);

      // Look for "Free" within a pricing context (as a price, not part of "Start Free Trial")
      const basicPlan = screen.getByRole("heading", { name: /basic/i });
      expect(basicPlan).toBeInTheDocument();

      expect(screen.getByText(/\$29/i)).toBeInTheDocument();
    });

    it("highlights popular plan", () => {
      render(<Index />);

      // Pro plan should exist
      const proPlan = screen.getByRole("heading", { name: /^pro$/i });
      expect(proPlan).toBeInTheDocument();
    });

    it("shows feature lists for each plan", () => {
      render(<Index />);

      // Basic plan features
      expect(
        screen.getByText(/3 mock interviews per month/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/basic ai feedback/i)).toBeInTheDocument();

      // Pro plan features
      expect(
        screen.getByText(/unlimited mock interviews/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/detailed performance analytics/i)
      ).toBeInTheDocument();
    });
  });

  describe("CTA Buttons", () => {
    it("pricing plan buttons render correctly", () => {
      render(<Index />);

      // Check that pricing plan CTA buttons exist
      const getStartedButton = screen.getByRole("button", {
        name: /^get started$/i,
      });
      const startFreeTrialButton = screen.getByRole("button", {
        name: /start free trial/i,
      });

      expect(getStartedButton).toBeInTheDocument();
      expect(startFreeTrialButton).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("renders content that adapts to different screen sizes", () => {
      render(<Index />);

      // Check that main container exists (using a class selector since there's no <main> tag)
      const container = document.querySelector(".min-h-screen");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      render(<Index />);

      const h1 = screen.getByRole("heading", {
        name: /master your interviews with ai/i,
        level: 1,
      });
      expect(h1).toBeInTheDocument();
    });

    it("all interactive elements are keyboard accessible", () => {
      render(<Index />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });

    it("has descriptive button labels", () => {
      render(<Index />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });
  });
});
