import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Interview from "../page";
import { getInterviewQuestions, uploadAudio } from "@/lib/api";

// Mock Next.js navigation
const mockGet = jest.fn();
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock Next.js Head
jest.mock("next/head", () => {
  return function Head({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

// Mock toast hook
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

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
    <div data-testid="error-state">{message}</div>
  ),
}));

jest.mock("@/components/interview/InterviewHeader", () => ({
  InterviewHeader: ({
    activeCall,
    onEndCall,
  }: {
    activeCall: boolean;
    onEndCall: () => void;
  }) => (
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
    autoRecordCountdown,
  }: {
    question: string;
    showingCountdown: boolean;
    autoRecordCountdown: number;
  }) => (
    <div data-testid="question-display">
      <p>{question}</p>
      {showingCountdown && <span>Countdown: {autoRecordCountdown}s</span>}
    </div>
  ),
}));

jest.mock("@/components/interview/AnswerSection", () => ({
  AnswerSection: ({
    recording,
    isRecording,
  }: {
    recording: { url: string | null };
    isRecording: boolean;
  }) => (
    <div data-testid="answer-section">
      {isRecording && <span>Recording...</span>}
      {recording?.url && <span>Has Recording</span>}
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
  }) => (
    <div data-testid="recording-controls">
      {activeCall && !isRecording && !hasRecording && (
        <button onClick={onStartRecording}>Start Recording</button>
      )}
      {isRecording && (
        <>
          <button onClick={onStopRecording}>Stop Recording</button>
          <span>Time: {recordingTime}s</span>
          <span>Remaining: {timeRemaining}s</span>
        </>
      )}
    </div>
  ),
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
      Question {currentQuestion + 1} of {totalQuestions} - {progress}%
    </div>
  ),
}));

jest.mock("@/components/interview/InterviewNavigation", () => ({
  InterviewNavigation: ({
    isLastQuestion,
    isUploading,
    onNext,
  }: {
    isLastQuestion: boolean;
    activeCall: boolean;
    hasCurrentQuestionBeenAnswered: boolean;
    isRecording: boolean;
    isUploading: boolean;
    onNext: () => void;
  }) => (
    <div data-testid="interview-navigation">
      <button onClick={onNext} disabled={isUploading}>
        {isLastQuestion ? "Submit Interview" : "Next Question"}
      </button>
      {isUploading && <span>Uploading...</span>}
    </div>
  ),
}));

// Mock MediaRecorder
class MockMediaRecorder {
  state: string = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    if (this.ondataavailable) {
      this.ondataavailable({
        data: new Blob(["audio data"], { type: "audio/webm" }),
      });
    }
    if (this.onstop) {
      this.onstop();
    }
  }

  static isTypeSupported(type: string) {
    return type === "audio/webm; codecs=opus";
  }
}

// Mock MediaStream
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor() {
    const mockTrack = {
      stop: jest.fn(),
      muted: false,
    } as unknown as MediaStreamTrack;
    this.tracks.push(mockTrack);
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks;
  }
}

global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// Mock getUserMedia
const mockGetUserMedia = jest.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock data
const mockQuestions = [
  {
    id: "q1",
    question: "Tell me about yourself",
    order: 0,
  },
  {
    id: "q2",
    question: "What are your strengths?",
    order: 1,
  },
  {
    id: "q3",
    question: "Where do you see yourself in 5 years?",
    order: 2,
  },
];

describe("Interview Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGet.mockReturnValue("session-123");
    mockGetUserMedia.mockResolvedValue(new MockMediaStream());
    (getInterviewQuestions as jest.Mock).mockResolvedValue({
      questions: mockQuestions,
    });
    (uploadAudio as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Page Rendering and Loading", () => {
    it("should display loading state initially", () => {
      render(<Interview />);
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    });

    it("should display error when no sessionId is provided", async () => {
      mockGet.mockReturnValue(null);

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
        expect(
          screen.getByText("No interview session ID provided")
        ).toBeInTheDocument();
      });
    });

    it("should display error when API call fails", async () => {
      (getInterviewQuestions as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
        expect(
          screen.getByText("Failed to load interview questions")
        ).toBeInTheDocument();
      });
    });

    it("should fetch questions on mount with sessionId", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(getInterviewQuestions).toHaveBeenCalledWith("session-123");
      });
    });

    it("should render interview interface after loading", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Interview Session")).toBeInTheDocument();
        expect(screen.getByTestId("interview-header")).toBeInTheDocument();
        expect(screen.getByTestId("question-display")).toBeInTheDocument();
      });
    });
  });

  describe("Question Display", () => {
    it("should display the first question", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
      });
    });

    it("should display question order and progress", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("progress-indicator")).toHaveTextContent(
          "Question 1 of 3"
        );
      });
    });

    it("should sort questions by order", async () => {
      const unorderedQuestions = [
        { id: "q2", question: "Question 2", order: 2 },
        { id: "q1", question: "Question 1", order: 1 },
        { id: "q3", question: "Question 3", order: 3 },
      ];

      (getInterviewQuestions as jest.Mock).mockResolvedValue({
        questions: unorderedQuestions,
      });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Question 1")).toBeInTheDocument();
      });
    });

    it("should handle questions as direct array response", async () => {
      (getInterviewQuestions as jest.Mock).mockResolvedValue(mockQuestions);

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
      });
    });

    it("should handle questions as object response", async () => {
      const objectResponse = {
        question1: { id: "q1", question: "Test Question", order: 0 },
      };

      (getInterviewQuestions as jest.Mock).mockResolvedValue(objectResponse);

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Question")).toBeInTheDocument();
      });
    });

    it("should display error when no valid questions format found", async () => {
      (getInterviewQuestions as jest.Mock).mockResolvedValue({});

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("No questions found for this interview")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Auto-Recording Countdown", () => {
    it("should show countdown when question is unanswered", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Countdown: 30s/)).toBeInTheDocument();
      });
    });

    it("should decrement countdown every second", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Countdown: 30s/)).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Countdown: 29s/)).toBeInTheDocument();
      });
    });

    it("should not show countdown when recording", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.queryByText(/Countdown:/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Recording Functionality", () => {
    it("should start recording when button is clicked", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
        expect(screen.getByText(/Recording\.\.\./)).toBeInTheDocument();
      });
    });

    it("should stop recording when button is clicked", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Answer Recorded",
          description: "Your answer has been successfully recorded.",
        });
      });
    });

    it("should show recording time", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Time: 5s/)).toBeInTheDocument();
      });
    });

    it("should auto-stop recording after max time", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      act(() => {
        jest.advanceTimersByTime(90000); // 90 seconds
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Time's up!",
          description: "Your 1.5 minute answer time has ended.",
        });
      });
    });

    it("should handle microphone access denied", async () => {
      const user = userEvent.setup({ delay: null });
      mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to record your answers.",
          variant: "destructive",
        });
      });
    });

    it("should display 'Has Recording' after stopping", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Has Recording")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation Between Questions", () => {
    it("should show 'Next Question' button", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });
    });

    it("should not allow next without recording", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Next Question"));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Record Answer Required",
          description:
            "Please record your answer before moving to the next question.",
          variant: "destructive",
        });
      });
    });

    it("should move to next question after recording and clicking next", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      // Wait for initial question
      await waitFor(() => {
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
      });

      // Start recording
      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      // Stop recording
      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      // Click next
      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Next Question"));
      });

      // Should show second question
      await waitFor(() => {
        expect(
          screen.getByText("What are your strengths?")
        ).toBeInTheDocument();
      });
    });

    it("should upload audio when moving to next question", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      // Record answer
      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      // Click next
      await act(async () => {
        await user.click(screen.getByText("Next Question"));
      });

      await waitFor(() => {
        expect(uploadAudio).toHaveBeenCalledWith(
          expect.objectContaining({
            interview_id: "session-123",
            question_id: "q1",
            question_text: "Tell me about yourself",
            question_order: 0,
            is_last_question: false,
          })
        );
      });
    });

    it("should show 'Submit Interview' on last question", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      // Complete all 3 questions to get to the last one
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          expect(screen.getByText("Start Recording")).toBeInTheDocument();
        });

        await act(async () => {
          await user.click(screen.getByText("Start Recording"));
        });

        await waitFor(() => {
          expect(screen.getByText("Stop Recording")).toBeInTheDocument();
        });

        await act(async () => {
          await user.click(screen.getByText("Stop Recording"));
        });

        // Check button text based on question number
        if (i === 2) {
          // On the last question (3rd question)
          await waitFor(() => {
            expect(screen.getByText("Submit Interview")).toBeInTheDocument();
          });
        } else {
          // Not on last question yet
          await waitFor(() => {
            expect(screen.getByText("Next Question")).toBeInTheDocument();
          });

          await act(async () => {
            await user.click(screen.getByText("Next Question"));
          });
        }
      }
    });

    it("should handle upload error gracefully", async () => {
      const user = userEvent.setup({ delay: null });
      (uploadAudio as jest.Mock).mockRejectedValue(new Error("Upload failed"));

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      await act(async () => {
        await user.click(screen.getByText("Next Question"));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Upload Failed",
          description:
            "There was an error uploading your answer. Please try again.",
          variant: "destructive",
        });
      });
    });
  });

  describe("Interview Controls", () => {
    it("should render interview header with active call state", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("interview-header")).toHaveTextContent(
          "Active: true"
        );
      });
    });

    it("should end call when end button is clicked", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("End Call")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("End Call"));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Interview Ended",
          description: "You've ended the interview session.",
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("interview-header")).toHaveTextContent(
          "Active: false"
        );
      });
    });

    it("should stop recording when ending call", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      // Start recording
      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      // End call
      await act(async () => {
        await user.click(screen.getByText("End Call"));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Answer Recorded",
          description: "Your answer has been successfully recorded.",
        });
      });
    });
  });

  describe("Progress and UI Elements", () => {
    it("should display progress percentage", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        const progressText =
          screen.getByTestId("progress-indicator").textContent;
        expect(progressText).toContain("33"); // 1/3 = 33%
      });
    });

    it("should update progress as questions advance", async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(<Interview />);
      });

      // Complete first question
      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      await act(async () => {
        await user.click(screen.getByText("Next Question"));
      });

      // Check progress updated
      await waitFor(() => {
        const progressText =
          screen.getByTestId("progress-indicator").textContent;
        expect(progressText).toContain("Question 2 of 3");
        expect(progressText).toContain("66"); // 2/3 = 66%
      });
    });

    it("should display page title and meta description", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(document.querySelector("title")).toHaveTextContent(
          "Interview Session - Interviewly"
        );
      });
    });

    it("should render all main components", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("interview-header")).toBeInTheDocument();
        expect(screen.getByTestId("question-display")).toBeInTheDocument();
        expect(screen.getByTestId("answer-section")).toBeInTheDocument();
        expect(screen.getByTestId("recording-controls")).toBeInTheDocument();
        expect(screen.getByTestId("progress-indicator")).toBeInTheDocument();
        expect(screen.getByTestId("interview-navigation")).toBeInTheDocument();
      });
    });
  });

  describe("Cleanup and Memory Management", () => {
    it("should cleanup recording on unmount", async () => {
      const user = userEvent.setup({ delay: null });

      const { unmount } = await act(async () => {
        return render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Interview Session")).toBeInTheDocument();
      });

      // Create a recording to have URL to revoke
      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Start Recording"));
      });

      await waitFor(() => {
        expect(screen.getByText("Stop Recording")).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText("Stop Recording"));
      });

      // Wait for recording to be saved
      await waitFor(() => {
        expect(screen.getByText("Has Recording")).toBeInTheDocument();
      });

      unmount();

      // URL.revokeObjectURL should be called when recordings exist
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("should clear timers on unmount", async () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      const { unmount } = await act(async () => {
        return render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Interview Session")).toBeInTheDocument();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        const h1 = screen.getByRole("heading", { level: 1 });
        expect(h1).toHaveTextContent("Interview Session");
      });
    });

    it("should have accessible buttons", async () => {
      await act(async () => {
        render(<Interview />);
      });

      await waitFor(() => {
        expect(screen.getByText("Start Recording")).toBeInTheDocument();
        expect(screen.getByText("End Call")).toBeInTheDocument();
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });
    });
  });
});
