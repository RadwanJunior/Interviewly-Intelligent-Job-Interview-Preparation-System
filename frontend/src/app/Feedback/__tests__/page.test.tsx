/**
 * @file page.simple.test.tsx  
 * @description Simplified unit tests for the Feedback page component
 * Focuses on core functionality without complex async polling
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import Feedback from "../page";
import { getFeedback, getFeedbackStatus } from "@/lib/api";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
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

// Mock API functions
jest.mock("@/lib/api", () => ({
  getFeedback: jest.fn(),
  getFeedbackStatus: jest.fn(),
}));

// Mock useToast hook
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  CheckCircle2: () => <div data-testid="check-circle-icon">CheckCircle2</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  ArrowUpRight: () => <div data-testid="arrow-up-right-icon">ArrowUpRight</div>,
  MessageSquare: () => <div data-testid="message-square-icon">MessageSquare</div>,
  MicOff: () => <div data-testid="mic-off-icon">MicOff</div>,
  Volume2: () => <div data-testid="volume-icon">Volume2</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe("Feedback Page - Core Functionality", () => {
  const mockPush = jest.fn();
  const mockGet = jest.fn();

  // Sample feedback data
  const mockApiFeedback = {
    question_analysis: [
      {
        question: "Tell me about yourself",
        transcript: "I am a software engineer with 5 years of experience",
        feedback: {
          strengths: ["Clear communication"],
          areas_for_improvement: ["Add examples"],
          tips_for_improvement: ["Mention projects"],
        },
        tone_analysis: "Professional",
      },
    ],
    overall_feedback_summary: ["Strong technical knowledge"],
    communication_assessment: ["Clear articulation"],
    overall_sentiment: "positive",
    confidence_score: 8,
    overall_improvement_steps: ["Practice STAR method"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    mockGet.mockReturnValue("test-session-123");
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet,
    });
  });

  describe("Error States", () => {
    it("should show error when sessionId is missing", async () => {
      mockGet.mockReturnValue(null);
      
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Error Loading Feedback")).toBeInTheDocument();
      });
    });

    it("should show error message for API failure", async () => {
      (getFeedbackStatus as jest.Mock).mockResolvedValue({
        status: "error",
        message: "Test error",
      });
      
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Test error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Successful Feedback Display", () => {
    beforeEach(() => {
      (getFeedbackStatus as jest.Mock).mockResolvedValue({
        status: "completed",
      });
      (getFeedback as jest.Mock).mockResolvedValue({
        status: "success",
        feedback: mockApiFeedback,
      });
    });

    it("should render page title after loading", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Your Interview Feedback")).toBeInTheDocument();
      });
    });

    it("should display overall performance section", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Overall Performance")).toBeInTheDocument();
      });
    });

    it("should show question feedback", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
      });
    });

    it("should display Copy Feedback button", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Copy Feedback/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      (getFeedbackStatus as jest.Mock).mockResolvedValue({
        status: "completed",
      });
      (getFeedback as jest.Mock).mockResolvedValue({
        status: "success",
        feedback: mockApiFeedback,
      });
    });

    it("should have Practice Again button", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Practice Again/i })
        ).toBeInTheDocument();
      });
    });

    it("should navigate to Workflow on Practice Again click", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(async () => {
        const button = screen.getByRole("button", { name: /Practice Again/i });
        fireEvent.click(button);
        expect(mockPush).toHaveBeenCalledWith("/Workflow");
      });
    });
  });

  describe("Copy Functionality", () => {
    beforeEach(() => {
      (getFeedbackStatus as jest.Mock).mockResolvedValue({
        status: "completed",
      });
      (getFeedback as jest.Mock).mockResolvedValue({
        status: "success",
        feedback: mockApiFeedback,
      });
    });

    it("should copy feedback to clipboard", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(async () => {
        const copyButton = screen.getByRole("button", {
          name: /Copy Feedback/i,
        });
        
        await act(async () => {
          fireEvent.click(copyButton);
        });
        
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it("should show toast after copying", async () => {
      await act(async () => {
        render(<Feedback />);
      });
      
      await waitFor(async () => {
        const copyButton = screen.getByRole("button", {
          name: /Copy Feedback/i,
        });
        
        await act(async () => {
          fireEvent.click(copyButton);
        });
        
        expect(mockToast).toHaveBeenCalledWith({
          title: "Feedback Copied",
          description: "Interview feedback has been copied to your clipboard.",
        });
      });
    });
  });
});
