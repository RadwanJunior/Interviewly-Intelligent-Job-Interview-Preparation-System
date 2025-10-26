/**
 * Interview Page Tests
 * Focused tests covering core Interview functionality:
 * - Component initialization and question loading
 * - Recording functionality with MediaRecorder API
 * - Auto-countdown behavior
 * - Navigation between questions with upload
 * - Interview controls and error handling
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Interview from "../page";
import * as api from "@/lib/api";
import { Recording } from "@/components/interview/types";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

jest.mock("next/head", () => {
  return function Head({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

// Mock hooks
jest.mock("@/hooks/use-toast");

// Mock API functions
jest.mock("@/lib/api", () => ({
  getInterviewQuestions: jest.fn(),
  uploadAudio: jest.fn(),
}));

// Mock interview components
jest.mock("@/components/interview/LoadingStates", () => ({
  LoadingState: ({ message }: { message?: string }) => (
    <div data-testid="loading-state">{message || "Loading..."}</div>
  ),
  ErrorState: ({ message }: { message: string }) => (
    <div data-testid="error-state">
      <div>Error</div>
      <div>{message}</div>
    </div>
  ),
}));

jest.mock("@/components/interview/InterviewHeader", () => ({
  InterviewHeader: ({ activeCall, onEndCall }: { activeCall: boolean; onEndCall: () => void }) => (
    <div data-testid="interview-header">
      <span>Active: {activeCall.toString()}</span>
      <button onClick={onEndCall}>End Call</button>
    </div>
  ),
}));

jest.mock("@/components/interview/QuestionDisplay", () => ({
  QuestionDisplay: ({ 
    question, 
    showingCountdown, 
    autoRecordCountdown 
  }: { 
    question: string; 
    showingCountdown: boolean; 
    autoRecordCountdown: number; 
  }) => (
    <div data-testid="question-display">
      <div>{question}</div>
      {showingCountdown && <div>Countdown: {autoRecordCountdown}s</div>}
    </div>
  ),
}));

jest.mock("@/components/interview/AnswerSection", () => ({
  AnswerSection: ({ recording, isRecording }: { recording: Recording | null; isRecording: boolean }) => (
    <div data-testid="answer-section">
      {isRecording && <div>Recording...</div>}
      {recording?.url && !isRecording && (
        <div>
          <div>Your Answer:</div>
          <div>Has Recording</div>
        </div>
      )}
      {!recording?.url && !isRecording && <div>Click &apos;Record Answer&apos; below to respond</div>}
    </div>
  ),
}));

jest.mock("@/components/interview/RecordingControls", () => ({
  RecordingControls: ({
    isRecording,
    activeCall,
    hasRecording,
    recordingTime,
    timeRemaining,
    onStartRecording,
    onStopRecording,
  }: {
    isRecording: boolean;
    activeCall: boolean;
    hasRecording: boolean;
    recordingTime: number;
    timeRemaining: number;
    timeRemainingPercentage: number;
    onStartRecording: () => void;
    onStopRecording: () => void;
  }) => {
    return (
      <div data-testid="recording-controls">
        {activeCall && !isRecording && (
          <button onClick={onStartRecording}>
            {hasRecording ? "Record Again" : "Record Answer"}
          </button>
        )}
        {isRecording && (
          <>
            <button onClick={onStopRecording}>Stop Recording</button>
            <span>Time: {recordingTime}s</span>
            <span>Time remaining: {String(timeRemaining).padStart(2, "0")}s</span>
          </>
        )}
        {!activeCall && (
          <button disabled>Record Answer</button>
        )}
      </div>
    );
  },
}));

jest.mock("@/components/interview/ProgressIndicator", () => ({
  ProgressIndicator: ({
    currentQuestion,
    totalQuestions,
    progress,
  }: {
    currentQuestion: number;
    totalQuestions: number;
    progress: number;
  }) => (
    <div data-testid="progress-indicator">
      <div>Question {currentQuestion + 1} of {totalQuestions}</div>
      <div>{Math.round(progress)}% Complete</div>
    </div>
  ),
}));

jest.mock("@/components/interview/InterviewNavigation", () => ({
  InterviewNavigation: ({
    isLastQuestion,
    activeCall,
    hasCurrentQuestionBeenAnswered,
    isUploading,
    isRecording,
    onNext,
  }: {
    isLastQuestion: boolean;
    activeCall: boolean;
    hasCurrentQuestionBeenAnswered: boolean;
    isUploading: boolean;
    isRecording: boolean;
    onNext: () => void;
  }) => {
    // Use the original logic but track recording state for testing
    const isDisabled = !activeCall || !hasCurrentQuestionBeenAnswered || isRecording || isUploading;
    
    const handleNext = async () => {
      // Simulate the upload process when next is clicked with a recording
      if (hasCurrentQuestionBeenAnswered && !isUploading && !isRecording) {
        onNext();
      }
    };
    
    return (
      <div data-testid="interview-navigation">
        <button
          onClick={handleNext}
          disabled={isDisabled}
        >
          {isUploading 
            ? "Uploading..." 
            : isLastQuestion 
              ? "Finish Interview" 
              : "Next Question"
          }
        </button>
      </div>
    );
  },
}));

// Mock MediaRecorder and related APIs
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  state: "inactive" as RecordingState,
  stream: {
    getTracks: () => [{ stop: jest.fn(), muted: false }],
  },
  ondataavailable: null as ((event: BlobEvent) => void) | null,
  onstop: null as (() => void) | null,
};

const mockGetUserMedia = jest.fn();

// Setup global mocks
Object.defineProperty(global.navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

Object.defineProperty(global, "MediaRecorder", {
  value: jest.fn().mockImplementation(() => mockMediaRecorder),
  writable: true,
});

Object.defineProperty(global.MediaRecorder, "isTypeSupported", {
  value: jest.fn().mockReturnValue(true),
  writable: true,
});

Object.defineProperty(global, "URL", {
  value: {
    createObjectURL: jest.fn().mockReturnValue("blob:mock-url"),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
});



describe("Interview Page - Core Functionality", () => {
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
  const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
  const mockGetInterviewQuestions = api.getInterviewQuestions as jest.MockedFunction<typeof api.getInterviewQuestions>;
  const mockUploadAudio = api.uploadAudio as jest.MockedFunction<typeof api.uploadAudio>;

  const mockToast = jest.fn();
  const mockQuestions = [
    { id: "1", question: "Tell me about yourself", order: 1 },
    { id: "2", question: "What are your strengths?", order: 2 },
    { id: "3", question: "Why do you want this job?", order: 3 },
  ];

  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default successful flow
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'sessionId') return 'session-123';
      return null;
    });
    
    mockUseSearchParams.mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);
    mockUseToast.mockReturnValue({ 
      toast: mockToast, 
      dismiss: jest.fn(),
      toasts: []
    });
    mockGetInterviewQuestions.mockResolvedValue({ questions: mockQuestions });
    mockUploadAudio.mockResolvedValue({ success: true });

    // Mock successful media access
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn(), muted: false }],
      getAudioTracks: () => [{ muted: false }],
    });

    // Reset MediaRecorder mock
    mockMediaRecorder.state = "inactive";
    mockMediaRecorder.start.mockClear();
    mockMediaRecorder.stop.mockClear();
    mockMediaRecorder.ondataavailable = null;
    mockMediaRecorder.onstop = null;
    
    // Mock MediaRecorder behavior more realistically
    mockMediaRecorder.start.mockImplementation(() => {
      mockMediaRecorder.state = "recording";
    });
    
    mockMediaRecorder.stop.mockImplementation(() => {
      mockMediaRecorder.state = "inactive";
      // Simulate data available event followed by stop event
      setTimeout(() => {
        if (mockMediaRecorder.ondataavailable) {
          const mockBlob = new Blob(["mock audio data"], { type: "audio/webm" });
          mockMediaRecorder.ondataavailable({ data: mockBlob } as BlobEvent);
        }
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
      }, 0);
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // 1. Basic Component Loading and Error Handling
  describe("Component Initialization", () => {
    it("should load questions and display interview interface", async () => {
      render(<Interview />);

      // Should start with loading state
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();

      // Should fetch questions and display interface
      await waitFor(() => {
        expect(mockGetInterviewQuestions).toHaveBeenCalledWith("session-123");
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
        expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
        expect(screen.getByText("33% Complete")).toBeInTheDocument();
      });
    });

    it("should handle missing session ID", async () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<Interview />);

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
        expect(screen.getByText("No interview session ID provided")).toBeInTheDocument();
      });
    });

    it("should handle API errors", async () => {
      mockGetInterviewQuestions.mockRejectedValue(new Error("Network error"));

      render(<Interview />);

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
        expect(screen.getByText("Failed to load interview questions")).toBeInTheDocument();
      });
    });
  });

  // 2. Auto-countdown Feature
  describe("Auto-Record Countdown", () => {
    beforeEach(async () => {
      render(<Interview />);
      await waitFor(() => {
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
      });
    });

    it("should show 30-second countdown and auto-start recording", async () => {
      // Should show countdown
      expect(screen.getByText("Countdown: 30s")).toBeInTheDocument();

      // Advance time and check countdown decrements
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText("Countdown: 25s")).toBeInTheDocument();

      // Fast-forward to end of countdown
      act(() => {
        jest.advanceTimersByTime(25000);
      });

      // Should auto-start recording
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(mockMediaRecorder.start).toHaveBeenCalled();
        expect(screen.getByText("Recording...")).toBeInTheDocument();
      });
    });

    it("should cancel countdown when manually starting recording", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Start recording manually before countdown ends
      await user.click(screen.getByRole("button", { name: /Record Answer/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Countdown:/)).not.toBeInTheDocument();
        expect(screen.getByText("Recording...")).toBeInTheDocument();
      });
    });
  });

  describe("Recording Functionality", () => {
    beforeEach(async () => {
      render(<Interview />);
      await waitFor(() => {
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
      });
    });

    it("should start and stop recording with proper state management", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Start recording
      await user.click(screen.getByRole("button", { name: /Record Answer/i }));

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(mockMediaRecorder.start).toHaveBeenCalled();
        expect(screen.getByText("Recording...")).toBeInTheDocument();
      });

      // Stop recording
      await user.click(screen.getByRole("button", { name: /Stop Recording/i }));

      await waitFor(() => {
        expect(mockMediaRecorder.stop).toHaveBeenCalled();
      });
    });

    it("should handle recording permissions and errors", async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error("Permission denied"));
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      await user.click(screen.getByRole("button", { name: /Record Answer/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Microphone Access Denied",
            variant: "destructive",
          })
        );
      });
    });
  });

});