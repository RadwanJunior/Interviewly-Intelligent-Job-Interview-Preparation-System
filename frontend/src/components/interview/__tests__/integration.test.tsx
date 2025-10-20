import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InterviewHeader } from "../InterviewHeader";
import { QuestionDisplay } from "../QuestionDisplay";
import { RecordingControls } from "../RecordingControls";
import { AnswerSection } from "../AnswerSection";
import { InterviewNavigation } from "../InterviewNavigation";
import { ProgressIndicator } from "../ProgressIndicator";
import { LoadingState, ErrorState } from "../LoadingStates";

/**
 * Integration tests for interview components working together
 * These test real user workflows across multiple components
 */

describe("Interview Components Integration", () => {
  // Mock functions
  const mockOnStartRecording = jest.fn();
  const mockOnStopRecording = jest.fn();
  const mockOnEndCall = jest.fn();
  const mockOnNext = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Interview Flow", () => {
    it("should handle full question answering workflow", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <div>
          <InterviewHeader activeCall={true} onEndCall={mockOnEndCall} />
          <ProgressIndicator
            currentQuestion={0}
            totalQuestions={5}
            progress={0}
          />
          <QuestionDisplay
            question="Tell me about yourself"
            showingCountdown={false}
            autoRecordCountdown={0}
          />
          <RecordingControls
            isRecording={false}
            hasRecording={false}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={0}
            timeRemaining={90}
            timeRemainingPercentage={100}
          />
          <AnswerSection recording={null} isRecording={false} />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={true}
            hasCurrentQuestionBeenAnswered={false}
            isUploading={false}
            isRecording={false}
            onNext={mockOnNext}
          />
        </div>
      );

      // 1. Verify initial state - interview is active but no recording yet
      expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
      expect(screen.getByText("0% Complete")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Record Answer/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).toBeDisabled();

      // 2. Start recording
      await user.click(screen.getByRole("button", { name: /Record Answer/i }));
      expect(mockOnStartRecording).toHaveBeenCalledTimes(1);

      // 3. Update to recording state
      rerender(
        <div>
          <InterviewHeader activeCall={true} onEndCall={mockOnEndCall} />
          <ProgressIndicator
            currentQuestion={0}
            totalQuestions={5}
            progress={0}
          />
          <QuestionDisplay
            question="Tell me about yourself"
            showingCountdown={false}
            autoRecordCountdown={0}
          />
          <RecordingControls
            isRecording={true}
            hasRecording={false}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={5}
            timeRemaining={85}
            timeRemainingPercentage={94}
          />
          <AnswerSection recording={null} isRecording={true} />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={true}
            hasCurrentQuestionBeenAnswered={false}
            isUploading={false}
            isRecording={true}
            onNext={mockOnNext}
          />
        </div>
      );

      // Verify recording state
      expect(screen.getByText(/Recording\.\.\./i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Stop Recording/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).toBeDisabled(); // Still disabled while recording

      // 4. Stop recording
      await user.click(screen.getByRole("button", { name: /Stop Recording/i }));
      expect(mockOnStopRecording).toHaveBeenCalledTimes(1);

      // 5. Update to recorded state with answer
      const mockRecording = {
        blob: new Blob(),
        url: "blob:mock-url",
        duration: 10,
        mimeType: "audio/webm",
      };

      rerender(
        <div>
          <InterviewHeader activeCall={true} onEndCall={mockOnEndCall} />
          <ProgressIndicator
            currentQuestion={0}
            totalQuestions={5}
            progress={0}
          />
          <QuestionDisplay
            question="Tell me about yourself"
            showingCountdown={false}
            autoRecordCountdown={0}
          />
          <RecordingControls
            isRecording={false}
            hasRecording={true}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={0}
            timeRemaining={90}
            timeRemainingPercentage={100}
          />
          <AnswerSection recording={mockRecording} isRecording={false} />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={true}
            hasCurrentQuestionBeenAnswered={true}
            isUploading={false}
            isRecording={false}
            onNext={mockOnNext}
          />
        </div>
      );

      // 6. Verify answer is displayed and navigation is enabled
      expect(screen.getByText(/Your Answer:/i)).toBeInTheDocument();
      const audioElement = document.querySelector("audio");
      expect(audioElement).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).not.toBeDisabled();

      // 7. Navigate to next question
      await user.click(screen.getByRole("button", { name: /Next Question/i }));
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("should handle progress through multiple questions", () => {
      // Test progress indicator updates across questions
      const { rerender } = render(
        <ProgressIndicator
          currentQuestion={0}
          totalQuestions={5}
          progress={0}
        />
      );

      expect(screen.getByText("Question 1 of 5")).toBeInTheDocument();
      expect(screen.getByText("0% Complete")).toBeInTheDocument();

      rerender(
        <ProgressIndicator
          currentQuestion={2}
          totalQuestions={5}
          progress={40}
        />
      );
      expect(screen.getByText("Question 3 of 5")).toBeInTheDocument();
      expect(screen.getByText("40% Complete")).toBeInTheDocument();

      rerender(
        <ProgressIndicator
          currentQuestion={4}
          totalQuestions={5}
          progress={80}
        />
      );
      expect(screen.getByText("Question 5 of 5")).toBeInTheDocument();
      expect(screen.getByText("80% Complete")).toBeInTheDocument();
    });

    it("should change navigation button text on last question", () => {
      const { rerender } = render(
        <InterviewNavigation
          isLastQuestion={false}
          activeCall={true}
          hasCurrentQuestionBeenAnswered={true}
          isUploading={false}
          isRecording={false}
          onNext={mockOnNext}
        />
      );

      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).toBeInTheDocument();

      rerender(
        <InterviewNavigation
          isLastQuestion={true}
          activeCall={true}
          hasCurrentQuestionBeenAnswered={true}
          isUploading={false}
          isRecording={false}
          onNext={mockOnNext}
        />
      );

      expect(
        screen.getByRole("button", { name: /Finish Interview/i })
      ).toBeInTheDocument();
    });
  });

  describe("Recording State Management", () => {
    it("should sync recording state across components", () => {
      const { rerender } = render(
        <div>
          <RecordingControls
            isRecording={false}
            hasRecording={false}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={0}
            timeRemaining={90}
            timeRemainingPercentage={100}
          />
          <AnswerSection recording={null} isRecording={false} />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={true}
            hasCurrentQuestionBeenAnswered={false}
            isUploading={false}
            isRecording={false}
            onNext={mockOnNext}
          />
        </div>
      );

      // Not recording: shows placeholder, navigation disabled
      expect(
        screen.getByText(/Click 'Record Answer' below to respond/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).toBeDisabled();

      // Switch to recording
      rerender(
        <div>
          <RecordingControls
            isRecording={true}
            hasRecording={false}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={10}
            timeRemaining={80}
            timeRemainingPercentage={89}
          />
          <AnswerSection recording={null} isRecording={true} />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={true}
            hasCurrentQuestionBeenAnswered={false}
            isUploading={false}
            isRecording={true}
            onNext={mockOnNext}
          />
        </div>
      );

      // Recording: shows recording indicator, navigation still disabled
      expect(screen.getByText(/Recording\.\.\./i)).toBeInTheDocument();
      expect(screen.getByText(/00:10/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).toBeDisabled();
    });

    it("should handle re-recording workflow", async () => {
      const user = userEvent.setup();
      const mockRecording = {
        blob: new Blob(),
        url: "blob:mock-url",
        duration: 10,
        mimeType: "audio/webm",
      };

      render(
        <div>
          <RecordingControls
            isRecording={false}
            hasRecording={true}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={0}
            timeRemaining={90}
            timeRemainingPercentage={100}
          />
          <AnswerSection recording={mockRecording} isRecording={false} />
        </div>
      );

      // Has recording: shows "Record Again" button
      expect(
        screen.getByRole("button", { name: /Record Again/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Your Answer:/i)).toBeInTheDocument();

      // Click to re-record
      await user.click(screen.getByRole("button", { name: /Record Again/i }));
      expect(mockOnStartRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe("Call State Management", () => {
    it("should disable controls when call ends", () => {
      const { rerender } = render(
        <div>
          <InterviewHeader activeCall={true} onEndCall={mockOnEndCall} />
          <RecordingControls
            isRecording={false}
            hasRecording={false}
            activeCall={true}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={0}
            timeRemaining={90}
            timeRemainingPercentage={100}
          />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={true}
            hasCurrentQuestionBeenAnswered={true}
            isUploading={false}
            isRecording={false}
            onNext={mockOnNext}
          />
        </div>
      );

      expect(
        screen.getByRole("button", { name: /Record Answer/i })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).not.toBeDisabled();

      // End call
      rerender(
        <div>
          <InterviewHeader activeCall={false} onEndCall={mockOnEndCall} />
          <RecordingControls
            isRecording={false}
            hasRecording={false}
            activeCall={false}
            onStartRecording={mockOnStartRecording}
            onStopRecording={mockOnStopRecording}
            recordingTime={0}
            timeRemaining={90}
            timeRemainingPercentage={100}
          />
          <InterviewNavigation
            isLastQuestion={false}
            activeCall={false}
            hasCurrentQuestionBeenAnswered={true}
            isUploading={false}
            isRecording={false}
            onNext={mockOnNext}
          />
        </div>
      );

      expect(
        screen.getByRole("button", { name: /Record Answer/i })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).toBeDisabled();
    });

    it("should handle end call action", async () => {
      const user = userEvent.setup();

      render(<InterviewHeader activeCall={true} onEndCall={mockOnEndCall} />);

      await user.click(screen.getByRole("button", { name: /End Call/i }));
      expect(mockOnEndCall).toHaveBeenCalledTimes(1);
    });
  });

  describe("Upload State Management", () => {
    it("should disable navigation during upload", () => {
      const { rerender } = render(
        <InterviewNavigation
          isLastQuestion={false}
          activeCall={true}
          hasCurrentQuestionBeenAnswered={true}
          isUploading={false}
          isRecording={false}
          onNext={mockOnNext}
        />
      );

      expect(
        screen.getByRole("button", { name: /Next Question/i })
      ).not.toBeDisabled();

      rerender(
        <InterviewNavigation
          isLastQuestion={false}
          activeCall={true}
          hasCurrentQuestionBeenAnswered={true}
          isUploading={true}
          isRecording={false}
          onNext={mockOnNext}
        />
      );

      expect(
        screen.getByRole("button", { name: /Uploading\.\.\./i })
      ).toBeDisabled();
    });
  });

  describe("Countdown and Auto-record", () => {
    it("should show countdown before auto-recording", () => {
      const { rerender } = render(
        <QuestionDisplay
          question="What is your experience?"
          showingCountdown={true}
          autoRecordCountdown={10}
        />
      );

      expect(
        screen.getByText(/Recording will start automatically in/i)
      ).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();

      rerender(
        <QuestionDisplay
          question="What is your experience?"
          showingCountdown={true}
          autoRecordCountdown={5}
        />
      );

      expect(screen.getByText("5")).toBeInTheDocument();

      rerender(
        <QuestionDisplay
          question="What is your experience?"
          showingCountdown={false}
          autoRecordCountdown={0}
        />
      );

      expect(
        screen.queryByText(/Recording will start automatically/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    it("should handle recording time limits", () => {
      render(
        <RecordingControls
          isRecording={true}
          hasRecording={false}
          activeCall={true}
          onStartRecording={mockOnStartRecording}
          onStopRecording={mockOnStopRecording}
          recordingTime={85}
          timeRemaining={5}
          timeRemainingPercentage={5}
        />
      );

      // Near time limit
      expect(screen.getByText(/01:25/i)).toBeInTheDocument();
      expect(screen.getByText(/Time remaining: 00:05/i)).toBeInTheDocument();
    });

    it("should show loading states appropriately", () => {
      render(<LoadingState message="Processing your answer..." />);
      expect(screen.getByText("Processing your answer...")).toBeInTheDocument();
    });

    it("should show error states appropriately", () => {
      render(
        <ErrorState message="Failed to upload recording. Please try again." />
      );
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to upload recording. Please try again.")
      ).toBeInTheDocument();
    });
  });
});
