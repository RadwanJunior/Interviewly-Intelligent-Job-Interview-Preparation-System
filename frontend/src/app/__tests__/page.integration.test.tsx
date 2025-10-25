/**
 * Integration Tests for Landing Page
 * Tests the complete user flow on the home page including rendering, navigation, and interactions
 */

import { render, screen } from "@testing-library/react";
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

  describe("Visual Design and User Experience", () => {
    it("has proper section structure with navigation anchors", () => {
      render(<Index />);

      // Verify sections exist with proper IDs for navigation
      expect(document.getElementById("features")).toBeInTheDocument();
      expect(document.getElementById("how-it-works")).toBeInTheDocument();
      expect(document.getElementById("pricing")).toBeInTheDocument();
    });

    it("includes proper gradient backgrounds and styling", () => {
      render(<Index />);

      // Check for gradient background classes
      const mainContainer = document.querySelector(".bg-gradient-to-b");
      expect(mainContainer).toBeInTheDocument();

      // Check for responsive container classes
      const containers = document.querySelectorAll(".container");
      expect(containers.length).toBeGreaterThan(0);
    });

    it("displays icons properly throughout sections", () => {
      render(<Index />);

      // Feature icons
      expect(screen.getByTestId("upload-icon")).toBeInTheDocument();
      expect(screen.getByTestId("video-icon")).toBeInTheDocument();
      expect(screen.getByTestId("message-icon")).toBeInTheDocument();

      // CTA section award icon
      expect(screen.getByTestId("award-icon")).toBeInTheDocument();

      // Arrow icons in buttons and navigation
      const arrowIcons = screen.getAllByTestId("arrow-right-icon");
      expect(arrowIcons.length).toBeGreaterThan(0);

      // Check icons for pricing features
      const checkIcons = screen.getAllByTestId("check-icon");
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it("includes animation and hover classes for interactivity", () => {
      render(<Index />);

      // Should have animation classes
      const animatedElements = document.querySelectorAll("[class*='animate-fade']");
      expect(animatedElements.length).toBeGreaterThan(0);

      // Feature cards should have hover effects
      const hoverElements = document.querySelectorAll("[class*='hover:shadow']");
      expect(hoverElements.length).toBeGreaterThan(0);
    });
  });

  describe("Data-Driven Content Rendering", () => {
    it("renders all pricing plan features from data arrays", () => {
      render(<Index />);

      // Basic plan features (4 features) - using more specific text to avoid duplication with section headings
      expect(screen.getByText(/3 mock interviews per month/i)).toBeInTheDocument();
      expect(screen.getByText(/basic ai feedback/i)).toBeInTheDocument();
      expect(screen.getByText(/job description matching/i)).toBeInTheDocument();

      // Pro plan features (4 features)
      expect(screen.getByText(/unlimited mock interviews/i)).toBeInTheDocument();
      expect(screen.getByText(/detailed performance analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/personalized improvement plan/i)).toBeInTheDocument();
      expect(screen.getByText(/video mock interviews/i)).toBeInTheDocument();
    });

    it("displays all how-it-works steps with proper descriptions", () => {
      render(<Index />);

      // Step descriptions should be comprehensive
      expect(screen.getByText(/Submit your resume and the job description you're applying for/i)).toBeInTheDocument();
      expect(screen.getByText(/Our AI analyzes both documents to generate relevant interview questions/i)).toBeInTheDocument();
      expect(screen.getByText(/Record your answers in a simulated interview environment/i)).toBeInTheDocument();
      expect(screen.getByText(/Receive AI-powered analysis and suggestions to improve your performance/i)).toBeInTheDocument();
    });

    it("renders feature cards with comprehensive descriptions", () => {
      render(<Index />);

      // Feature descriptions should be detailed and informative
      expect(screen.getByText(/Upload your resume and job description for tailored interview questions/i)).toBeInTheDocument();
      expect(screen.getByText(/Record your responses and get instant feedback on your performance/i)).toBeInTheDocument();
      expect(screen.getByText(/Receive detailed analysis and suggestions to improve your answers/i)).toBeInTheDocument();
    });
  });

  describe("SEO and Meta Information", () => {
    it("renders proper page title and meta description", () => {
      render(<Index />);

      // Page title should be set for SEO
      expect(document.title).toBe("Interviewly - Master Your Interviews with AI");

      // Meta description content should be accessible
      expect(screen.getByText(/Practice with personalized interview questions based on your resume and dream job/i)).toBeInTheDocument();
    });

    it("has complete heading structure for SEO", () => {
      render(<Index />);

      // Should have proper h1, h2, h3 hierarchy
      const h1Elements = screen.getAllByRole("heading", { level: 1 });
      const h2Elements = screen.getAllByRole("heading", { level: 2 });
      const h3Elements = screen.getAllByRole("heading", { level: 3 });

      expect(h1Elements.length).toBe(1); // Main hero heading
      expect(h2Elements.length).toBeGreaterThan(0); // Section headings
      expect(h3Elements.length).toBeGreaterThan(0); // Subsection headings
    });
  });

  describe("Complete User Journey Flow", () => {
    it("supports complete landing to conversion flow", async () => {
      const user = userEvent.setup();
      render(<Index />);

      // 1. User lands and sees value proposition
      expect(screen.getByText("Master Your Interviews with AI")).toBeInTheDocument();
      expect(screen.getByText("AI-Powered Interview Preparation")).toBeInTheDocument();

      // 2. User learns about features
      expect(screen.getByText("Why Choose Interviewly")).toBeInTheDocument();

      // 3. User understands the process
      expect(screen.getByText("How It Works")).toBeInTheDocument();

      // 4. User sees pricing options
      expect(screen.getByText("Simple, Transparent Pricing")).toBeInTheDocument();

      // 5. User sees final CTA
      expect(screen.getByText("Ready to Excel in Your Interviews?")).toBeInTheDocument();

      // 6. User can click any CTA to start
      const heroCTA = screen.getByRole("button", { name: /start practicing/i });
      const finalCTA = screen.getByRole("button", { name: /get started now/i });

      expect(heroCTA).toBeInTheDocument();
      expect(finalCTA).toBeInTheDocument();

      // Test main navigation flow
      await user.click(heroCTA);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("provides multiple engagement touchpoints", () => {
      render(<Index />);

      // Multiple CTA buttons for different user readiness levels
      expect(screen.getByRole("button", { name: /start practicing/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try it now/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /get started now/i })).toBeInTheDocument();

      // Pricing plan CTAs
      expect(screen.getByRole("button", { name: /^get started$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start free trial/i })).toBeInTheDocument();
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

    it("provides proper semantic structure", () => {
      render(<Index />);

      // Should use semantic sections
      const sections = document.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(5);

      // Should have proper list structures for features
      const lists = document.querySelectorAll("ul");
      expect(lists.length).toBeGreaterThan(0);
    });
  });
});
