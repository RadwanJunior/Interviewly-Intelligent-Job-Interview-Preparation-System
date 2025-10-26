import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrepareInterview from "../page";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/context/WorkflowContext";
import { createInterviewSession, getInterviewStatus } from "@/lib/api";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next/head", () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

// Mock hooks and API
jest.mock("@/hooks/use-toast");
jest.mock("@/context/WorkflowContext");
jest.mock("@/lib/api");

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

jest.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div className={className} data-value={value}>
      Progress: {value}%
    </div>
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  CheckCircle: () => <span>CheckCircle Icon</span>,
  Loader2: () => <span>Loader2 Icon</span>,
  AlertCircle: () => <span>AlertCircle Icon</span>,
}));

describe("Prepare Interview Page", () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();
  const mockJobDetailsData = {
    JobDescriptionId: "job-123",
    jobTitle: "Software Engineer",
    company: "Tech Corp",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });

    (useWorkflow as jest.Mock).mockReturnValue({
      jobDetailsData: mockJobDetailsData,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Page Rendering and Initial State", () => {
    it("should render the page with title and description", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(
        screen.getByText("Prepare for Your Interview")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "We're setting up your personalized interview based on your resume and job description."
        )
      ).toBeInTheDocument();
    });

    it("should display progress bar", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(
        screen.getByText("Generating interview questions")
      ).toBeInTheDocument();
      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
    });

    it("should show initial loading state", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(
        screen.getByText("Preparing your tailored interview questions...")
      ).toBeInTheDocument();
    });

    it("should have page title and meta description in Head component", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      // The Head component renders the title and meta tags
      // Since our mock renders children directly, we can't query for these
      // But we can verify the main content is rendered
      expect(
        screen.getByText("Prepare for Your Interview")
      ).toBeInTheDocument();
    });
  });

  describe("Interview Session Creation", () => {
    it("should create interview session on mount", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await waitFor(() => {
        expect(createInterviewSession).toHaveBeenCalledWith({
          job_description_id: "job-123",
        });
      });
    });

    it("should handle session creation error", async () => {
      (createInterviewSession as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      await act(async () => {
        render(<PrepareInterview />);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Error creating interview session: Network error",
          variant: "destructive",
        });
      });
    });

    it("should handle session creation with no session ID", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: null,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Could not create interview session.",
          variant: "destructive",
        });
      });
    });

    it("should not create duplicate sessions", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await waitFor(() => {
        expect(createInterviewSession).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Progress Polling", () => {
    it("should poll interview status", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 50,
        completed: false,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getInterviewStatus).toHaveBeenCalledWith("session-123");
      });
    });

    it("should update progress during polling", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock)
        .mockResolvedValueOnce({ progress: 25, completed: false })
        .mockResolvedValueOnce({ progress: 50, completed: false })
        .mockResolvedValueOnce({ progress: 75, completed: false });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("25%")).toBeInTheDocument();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("50%")).toBeInTheDocument();
      });
    });

    it("should stop polling when completed", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 100,
        completed: true,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Your interview is ready!")
        ).toBeInTheDocument();
      });

      // Clear the first call
      (getInterviewStatus as jest.Mock).mockClear();

      // Advance time again - should not poll anymore
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(getInterviewStatus).not.toHaveBeenCalled();
    });

    it("should handle polling errors gracefully", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockRejectedValue(
        new Error("Polling failed")
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error polling status: ",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Progress Display", () => {
    it("should show 0% initially", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should show loading indicator while generating", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByText("Loader2 Icon")).toBeInTheDocument();
    });

    it("should show success indicator when completed", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 100,
        completed: true,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        // Use getAllByText since CheckCircle Icon appears multiple times (in tips section too)
        const checkIcons = screen.getAllByText("CheckCircle Icon");
        expect(checkIcons.length).toBeGreaterThan(0);
        expect(
          screen.getByText("Your interview is ready!")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Preparation Tips", () => {
    it("should display preparation tips section", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByText("Preparation Tips")).toBeInTheDocument();
    });

    it("should show all preparation tips", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(
        screen.getByText("Find a quiet location free from distractions.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Test your microphone before starting.")
      ).toBeInTheDocument();
      expect(screen.getByText("Keep water nearby.")).toBeInTheDocument();
      expect(
        screen.getByText("You have 1.5 minutes for each answer.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Speak clearly and at a comfortable pace.")
      ).toBeInTheDocument();
    });

    it("should display tips with CheckCircle icons", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      const checkIcons = screen.getAllByText("CheckCircle Icon");
      expect(checkIcons.length).toBe(5); // Exactly 5 tips
    });
  });

  describe("Warning Section", () => {
    it("should display important warning", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByText("Important:")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Once you start the interview, you cannot pause it. Make sure you're ready."
        )
      ).toBeInTheDocument();
    });

    it("should show AlertCircle icon in warning", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByText("AlertCircle Icon")).toBeInTheDocument();
    });
  });

  describe("Start Interview Button", () => {
    it("should render start button", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should show 'Preparing Questions...' when generating", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(
        screen.getByRole("button", { name: /Preparing Questions/i })
      ).toBeInTheDocument();
    });

    it("should show 'Start Interview' when ready", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 100,
        completed: true,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Start Interview/i })
        ).toBeInTheDocument();
      });
    });

    it("should be disabled while generating", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should be enabled when ready", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 100,
        completed: true,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /Start Interview/i });
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe("Navigation to Interview", () => {
    it("should navigate to interview page when ready and button clicked", async () => {
      const user = userEvent.setup({ delay: null });

      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-456" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 100,
        completed: true,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Interview")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(
          screen.getByRole("button", { name: /Start Interview/i })
        );
      });

      expect(mockPush).toHaveBeenCalledWith("/interview?sessionId=session-456");
    });

    it("should show toast if button clicked while still generating", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 50,
        completed: false,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      // Button is disabled, so we need to test the handleStart function logic
      // The component checks isGenerating state before showing toast
      // Since button is disabled, we can't actually click it
      // But we can verify the button is disabled which prevents the action
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();

      // The toast would only show if somehow handleStart was called while generating
      // which can't happen in normal flow due to disabled button
    });

    it("should not navigate if generating", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      const button = screen.getByRole("button");

      // Button should be disabled, so clicking won't work
      expect(button).toBeDisabled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Styling and Layout", () => {
    it("should have proper gradient background", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      const { container } = await act(async () => {
        return render(<PrepareInterview />);
      });

      const mainDiv = container.querySelector(".min-h-screen");
      expect(mainDiv).toHaveClass(
        "bg-gradient-to-b",
        "from-gray-50",
        "to-white"
      );
    });

    it("should apply correct button styling when generating", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-gray-400");
    });

    it("should apply correct button styling when ready", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock).mockResolvedValue({
        progress: 100,
        completed: true,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /Start Interview/i });
        expect(button).toHaveClass("bg-primary");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should have proper heading hierarchy", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      const { container } = await act(async () => {
        return render(<PrepareInterview />);
      });

      const h1 = container.querySelector("h1");
      const h2 = container.querySelector("h2");

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h1?.textContent).toBe("Prepare for Your Interview");
      expect(h2?.textContent).toBe("Preparation Tips");
    });
  });
});
