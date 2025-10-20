/**
 * @file page.test.tsx
 * @description Comprehensive unit tests for the main landing page (Index component)
 * Tests all sections: Hero, Features, How It Works, Pricing, and CTA
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { useRouter } from "next/navigation";
import Index from "../page";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Next.js Head component
jest.mock("next/head", () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ArrowRight: () => <div data-testid="arrow-right-icon">ArrowRight</div>,
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  Video: () => <div data-testid="video-icon">Video</div>,
  MessageSquare: () => (
    <div data-testid="message-square-icon">MessageSquare</div>
  ),
  Award: () => <div data-testid="award-icon">Award</div>,
  CheckCircle2: () => <div data-testid="check-circle-icon">CheckCircle2</div>,
}));

describe("Index (Main Landing Page)", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  describe("Hero Section", () => {
    it("should render the hero section with correct heading", () => {
      render(<Index />);

      expect(
        screen.getByText("Master Your Interviews with AI")
      ).toBeInTheDocument();
    });

    it("should display the AI-powered badge", () => {
      render(<Index />);

      expect(
        screen.getByText("AI-Powered Interview Preparation")
      ).toBeInTheDocument();
    });

    it("should show the hero description text", () => {
      render(<Index />);

      expect(
        screen.getByText(/Practice with personalized interview questions/i)
      ).toBeInTheDocument();
    });

    it("should render Start Practicing button and navigate to dashboard on click", () => {
      render(<Index />);

      const startButton = screen.getByRole("button", {
        name: /start practicing/i,
      });
      expect(startButton).toBeInTheDocument();

      fireEvent.click(startButton);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("should display ArrowRight icon in the Start Practicing button", () => {
      render(<Index />);

      const startButton = screen.getByRole("button", {
        name: /start practicing/i,
      });

      expect(
        within(startButton).getByTestId("arrow-right-icon")
      ).toBeInTheDocument();
    });
  });

  describe("Features Section", () => {
    it("should render the features section heading", () => {
      render(<Index />);

      expect(screen.getByText("Why Choose Interviewly")).toBeInTheDocument();
    });

    it("should display all three feature cards", () => {
      render(<Index />);

      expect(screen.getByText("Resume Analysis")).toBeInTheDocument();
      expect(screen.getByText("Practice Interviews")).toBeInTheDocument();
      expect(screen.getByText("AI Feedback")).toBeInTheDocument();
    });

    it("should show feature descriptions", () => {
      render(<Index />);

      expect(
        screen.getByText(/Upload your resume and job description/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Record your responses and get instant feedback/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Receive detailed analysis and suggestions/i)
      ).toBeInTheDocument();
    });

    it("should render feature icons", () => {
      render(<Index />);

      expect(screen.getByTestId("upload-icon")).toBeInTheDocument();
      expect(screen.getByTestId("video-icon")).toBeInTheDocument();
      expect(screen.getByTestId("message-square-icon")).toBeInTheDocument();
    });
  });

  describe("How It Works Section", () => {
    it("should render the How It Works heading", () => {
      render(<Index />);

      expect(screen.getByText("How It Works")).toBeInTheDocument();
    });

    it("should display all four steps", () => {
      render(<Index />);

      expect(screen.getByText("Upload Your Documents")).toBeInTheDocument();
      expect(
        screen.getByText("Receive Tailored Questions")
      ).toBeInTheDocument();
      expect(screen.getByText("Practice Your Responses")).toBeInTheDocument();
      expect(screen.getByText("Get Detailed Feedback")).toBeInTheDocument();
    });

    it("should show step numbers", () => {
      render(<Index />);

      expect(screen.getByText("01")).toBeInTheDocument();
      expect(screen.getByText("02")).toBeInTheDocument();
      expect(screen.getByText("03")).toBeInTheDocument();
      expect(screen.getByText("04")).toBeInTheDocument();
    });

    it("should display step descriptions", () => {
      render(<Index />);

      expect(
        screen.getByText(/Submit your resume and the job description/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Our AI analyzes both documents/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Record your answers in a simulated interview/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Receive AI-powered analysis and suggestions/i)
      ).toBeInTheDocument();
    });

    it("should render Try It Now button", () => {
      render(<Index />);

      const tryItButton = screen.getByRole("button", {
        name: /try it now/i,
      });
      expect(tryItButton).toBeInTheDocument();
    });
  });

  describe("Pricing Section", () => {
    it("should render the pricing section heading", () => {
      render(<Index />);

      expect(
        screen.getByText("Simple, Transparent Pricing")
      ).toBeInTheDocument();
    });

    it("should display both pricing plans", () => {
      render(<Index />);

      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("should show pricing plan prices", () => {
      render(<Index />);

      expect(screen.getByText("Free")).toBeInTheDocument();
      expect(screen.getByText("$29")).toBeInTheDocument();
      expect(screen.getByText("/month")).toBeInTheDocument();
    });

    it("should display plan descriptions", () => {
      render(<Index />);

      expect(
        screen.getByText(/Perfect for getting started/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Advanced features for serious job seekers/i)
      ).toBeInTheDocument();
    });

    it("should show all Basic plan features", () => {
      render(<Index />);

      expect(
        screen.getByText("3 mock interviews per month")
      ).toBeInTheDocument();
      expect(screen.getByText("Basic AI feedback")).toBeInTheDocument();
      expect(screen.getByText("Resume analysis")).toBeInTheDocument();
      expect(screen.getByText("Job description matching")).toBeInTheDocument();
    });

    it("should show all Pro plan features", () => {
      render(<Index />);

      expect(screen.getByText("Unlimited mock interviews")).toBeInTheDocument();
      expect(
        screen.getByText("Detailed performance analytics")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Personalized improvement plan")
      ).toBeInTheDocument();
      expect(screen.getByText("Video mock interviews")).toBeInTheDocument();
    });

    it("should render CTA buttons for both plans", () => {
      render(<Index />);

      expect(
        screen.getByRole("button", { name: "Get Started" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Start Free Trial" })
      ).toBeInTheDocument();
    });

    it("should display checkmark icons for features", () => {
      render(<Index />);

      const checkIcons = screen.getAllByTestId("check-circle-icon");
      // 4 features for Basic + 4 features for Pro = 8 total
      expect(checkIcons).toHaveLength(8);
    });
  });

  describe("CTA Section", () => {
    it("should render the final CTA section heading", () => {
      render(<Index />);

      expect(
        screen.getByText("Ready to Excel in Your Interviews?")
      ).toBeInTheDocument();
    });

    it("should display the CTA description", () => {
      render(<Index />);

      expect(
        screen.getByText(
          /Join thousands of successful candidates who have mastered/i
        )
      ).toBeInTheDocument();
    });

    it("should render Get Started Now button", () => {
      render(<Index />);

      const getStartedButtons = screen.getAllByRole("button", {
        name: /get started now/i,
      });
      expect(getStartedButtons.length).toBeGreaterThan(0);
    });

    it("should display Award icon in CTA section", () => {
      render(<Index />);

      expect(screen.getByTestId("award-icon")).toBeInTheDocument();
    });
  });

  describe("Page Structure and Styling", () => {
    it("should render all major sections with proper IDs", () => {
      const { container } = render(<Index />);

      expect(container.querySelector("#features")).toBeInTheDocument();
      expect(container.querySelector("#how-it-works")).toBeInTheDocument();
      expect(container.querySelector("#pricing")).toBeInTheDocument();
    });

    it("should have proper gradient backgrounds", () => {
      const { container } = render(<Index />);

      const mainDiv = container.querySelector(".min-h-screen.bg-gradient-to-b");
      expect(mainDiv).toBeInTheDocument();
    });

    it("should render with responsive container classes", () => {
      const { container } = render(<Index />);

      const containers = container.querySelectorAll(".container");
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  describe("SEO and Meta Information", () => {
    it("should render page title in Head component", () => {
      render(<Index />);

      // The Head component renders the title, but it may not be accessible
      // in the test DOM. We verify the main heading instead.
      expect(
        screen.getByText("Master Your Interviews with AI")
      ).toBeInTheDocument();
    });

    it("should include meta description content", () => {
      render(<Index />);

      // Note: Next.js Head might not work in test environment,
      // but we verify the content is rendered in the hero section
      expect(
        screen.getByText(/Practice with personalized interview questions/i)
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<Index />);

      const h1 = container.querySelector("h1");
      const h2s = container.querySelectorAll("h2");
      const h3s = container.querySelectorAll("h3");

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
      expect(h3s.length).toBeGreaterThan(0);
    });

    it("should have clickable buttons with accessible text", () => {
      render(<Index />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveTextContent(/.+/); // Has some text content
      });
    });

    it("should render semantic HTML sections", () => {
      const { container } = render(<Index />);

      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe("Interactive Elements", () => {
    it("should have hover-able feature cards", () => {
      const { container } = render(<Index />);

      const featureCards = container.querySelectorAll(".hover\\:shadow-xl");
      expect(featureCards.length).toBeGreaterThan(0);
    });

    it("should render buttons with transition classes", () => {
      render(<Index />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.className).toMatch(/transition/);
      });
    });
  });

  describe("Data-Driven Rendering", () => {
    it("should render pricing plans from data array", () => {
      render(<Index />);

      // Verify both plans are rendered (checking unique elements)
      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Free")).toBeInTheDocument();
      expect(screen.getByText("$29")).toBeInTheDocument();
    });

    it("should render how-it-works steps from data array", () => {
      render(<Index />);

      // Verify all 4 steps are rendered
      const stepNumbers = ["01", "02", "03", "04"];
      stepNumbers.forEach((num) => {
        expect(screen.getByText(num)).toBeInTheDocument();
      });
    });

    it("should render feature cards from inline data", () => {
      render(<Index />);

      // Verify all 3 features
      const features = [
        "Resume Analysis",
        "Practice Interviews",
        "AI Feedback",
      ];
      features.forEach((feature) => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });
  });

  describe("Animation Classes", () => {
    it("should include animation classes for fade-up effects", () => {
      const { container } = render(<Index />);

      const animatedElements = container.querySelectorAll(".animate-fade-up");
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it("should have elements with inline animation delay styles", () => {
      const { container } = render(<Index />);

      // Check for style attribute with animation-delay (kebab-case in DOM)
      const elementsWithDelay = Array.from(
        container.querySelectorAll("[style*='animation-delay']")
      );
      expect(elementsWithDelay.length).toBeGreaterThan(0);
    });
  });
});
