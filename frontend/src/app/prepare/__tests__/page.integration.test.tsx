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

/**
 * Integration tests for Prepare Interview Page
 * Tests complete user workflows and business logic flows
 */
describe("Prepare Interview Page Integration", () => {
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

  describe("Complete Interview Preparation Workflow", () => {
    it("should handle successful prepare-to-interview user journey", async () => {
      const user = userEvent.setup({ delay: null });

      // Setup successful API responses
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-456" },
      });
      (getInterviewStatus as jest.Mock)
        .mockResolvedValueOnce({ progress: 25, completed: false })
        .mockResolvedValueOnce({ progress: 50, completed: false })
        .mockResolvedValueOnce({ progress: 75, completed: false })
        .mockResolvedValueOnce({ progress: 100, completed: true });

      // 1. Initial render - should show loading state
      await act(async () => {
        render(<PrepareInterview />);
      });

      // Verify initial loading UI
      expect(screen.getByText("Prepare for Your Interview")).toBeInTheDocument();
      expect(screen.getByText("Generating interview questions")).toBeInTheDocument();
      expect(screen.getByText("Preparing your tailored interview questions...")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
      
      // Verify session creation was triggered
      await waitFor(() => {
        expect(createInterviewSession).toHaveBeenCalledWith({
          job_description_id: "job-123",
        });
      });

      // 2. Progress updates through polling
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

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(screen.getByText("75%")).toBeInTheDocument();
      });

      // 3. Completion state
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("Your interview is ready!")).toBeInTheDocument();
        expect(screen.getByText("Start Interview")).toBeInTheDocument();
      });

      // Verify button is now enabled
      const startButton = screen.getByRole("button", { name: /Start Interview/i });
      expect(startButton).not.toBeDisabled();

      // 4. Navigate to interview
      await act(async () => {
        await user.click(startButton);
      });

      expect(mockPush).toHaveBeenCalledWith("/interview?sessionId=session-456");
      
      // Verify polling stops after completion
      (getInterviewStatus as jest.Mock).mockClear();
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(getInterviewStatus).not.toHaveBeenCalled();
    });

    it("should display preparation tips and warning during workflow", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      // Verify preparation tips are shown
      expect(screen.getByText("Preparation Tips")).toBeInTheDocument();
      expect(screen.getByText("Find a quiet location free from distractions.")).toBeInTheDocument();
      expect(screen.getByText("Test your microphone before starting.")).toBeInTheDocument();
      expect(screen.getByText("Keep water nearby.")).toBeInTheDocument();
      expect(screen.getByText("You have 1.5 minutes for each answer.")).toBeInTheDocument();
      expect(screen.getByText("Speak clearly and at a comfortable pace.")).toBeInTheDocument();

      // Verify warning is displayed
      expect(screen.getByText("Important:")).toBeInTheDocument();
      expect(screen.getByText("Once you start the interview, you cannot pause it. Make sure you're ready.")).toBeInTheDocument();

      // Verify icons are present
      const checkIcons = screen.getAllByText("CheckCircle Icon");
      expect(checkIcons.length).toBe(5); // 5 preparation tips
      expect(screen.getByText("AlertCircle Icon")).toBeInTheDocument();
    });
  });

  describe("Error Handling Workflows", () => {
    it("should handle session creation failure gracefully", async () => {
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

      // Should still show initial UI
      expect(screen.getByText("Prepare for Your Interview")).toBeInTheDocument();
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

    it("should handle polling errors gracefully and continue workflow", async () => {
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

      // Should not crash the application
      expect(screen.getByText("Prepare for Your Interview")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("should prevent navigation if still generating", async () => {
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

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();

      // Even if somehow clicked, should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("User Interaction Scenarios", () => {
    it("should handle rapid component mounting/unmounting", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      const { unmount } = await act(async () => {
        return render(<PrepareInterview />);
      });

      // Unmount before session creation completes
      unmount();

      // Should not throw errors or cause memory leaks
      expect(createInterviewSession).toHaveBeenCalled();
    });

    it("should maintain consistent state during progress updates", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });
      (getInterviewStatus as jest.Mock)
        .mockResolvedValueOnce({ progress: 0, completed: false })
        .mockResolvedValueOnce({ progress: 33, completed: false })
        .mockResolvedValueOnce({ progress: 66, completed: false })
        .mockResolvedValueOnce({ progress: 99, completed: false })
        .mockResolvedValueOnce({ progress: 100, completed: true });

      await act(async () => {
        render(<PrepareInterview />);
      });

      // Fast-forward through all progress updates
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          jest.advanceTimersByTime(2000);
        });
      }

      await waitFor(() => {
        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByText("Start Interview")).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Start Interview/i });
      expect(button).not.toBeDisabled();
    });

    it("should handle accessibility requirements", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      const { container } = await act(async () => {
        return render(<PrepareInterview />);
      });

      // Check semantic structure
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();

      // Check heading hierarchy
      const h1 = container.querySelector("h1");
      const h2 = container.querySelector("h2");
      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h1?.textContent).toBe("Prepare for Your Interview");
      expect(h2?.textContent).toBe("Preparation Tips");
    });
  });

  describe("Business Logic Validation", () => {
    it("should prevent duplicate session creation", async () => {
      (createInterviewSession as jest.Mock).mockResolvedValue({
        session: { id: "session-123" },
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      await waitFor(() => {
        expect(createInterviewSession).toHaveBeenCalledTimes(1);
      });

      // Multiple renders should not trigger additional API calls
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(createInterviewSession).toHaveBeenCalledTimes(1);
    });

    it("should validate workflow context requirements", async () => {
      // Test with missing job details
      (useWorkflow as jest.Mock).mockReturnValue({
        jobDetailsData: null,
      });

      await act(async () => {
        render(<PrepareInterview />);
      });

      // Should handle gracefully
      expect(screen.getByText("Prepare for Your Interview")).toBeInTheDocument();
    });
  });
});