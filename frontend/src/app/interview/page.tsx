"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Head from "next/head";
import {
  Mic,
  StopCircle,
  ArrowRight,
  Video,
  User,
  MessageSquare,
  Loader2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getInterviewQuestions } from "@/lib/api";

/**
 * Constants for timing controls in the interview
 */
// Maximum recording time in seconds (1.5 minutes)
const MAX_RECORDING_TIME = 90;
// Time before auto-starting recording (30 seconds)
const AUTO_RECORD_DELAY = 30;

/**
 * Interview Component - Handles the mock interview session flow
 * Features:
 * - Fetches interview questions based on session ID
 * - Manages audio recording for answers
 * - Automatically starts recording after delay
 * - Enforces question-by-question progression
 * - Requires answers before proceeding to next question
 */
const Interview = () => {
  // Get session ID from URL query parameters
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { toast } = useToast();

  // ===== STATE MANAGEMENT =====

  // Question and loading states
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<
    Array<{ blob: Blob | null; url: string | null }>
  >([]);
  const [recordingTime, setRecordingTime] = useState(0);

  // Interview session state
  const [activeCall, setActiveCall] = useState(true);

  // Auto-recording countdown states
  const [autoRecordCountdown, setAutoRecordCountdown] =
    useState(AUTO_RECORD_DELAY);
  const [showingCountdown, setShowingCountdown] = useState(false);

  // Track if current question has been answered
  const [hasCurrentQuestionBeenAnswered, setHasCurrentQuestionBeenAnswered] =
    useState(false);

  // ===== REFS =====

  // Refs for managing media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Refs for timers
  const timerRef = useRef<number | null>(null);
  const autoRecordTimerRef = useRef<number | null>(null);

  // ... keep existing code (fetchQuestions effect hook)
  
  useEffect(() => {
    const fetchQuestions = async () => {
      // Validate session ID exists
      if (!sessionId) {
        setError("No interview session ID provided");
        setLoading(false);
        return;
      }

      try {
        // Call API to get questions
        const response = await getInterviewQuestions(sessionId);

        // Handle response with questions property as array
        if (response && Array.isArray(response.questions)) {
          // Sort questions by order field
          const sortedQuestions = [...response.questions].sort(
            (a, b) => a.order - b.order
          );
          const questionTexts = sortedQuestions.map((q) => q.question);
          setQuestions(questionTexts);
          // Initialize recording placeholders for each question
          setRecordings(questionTexts.map(() => ({ blob: null, url: null })));
        }
        // Handle direct array response
        else if (response && Array.isArray(response)) {
          const sortedQuestions = [...response].sort(
            (a, b) => a.order - b.order
          );
          const questionTexts = sortedQuestions.map((q) => q.question);
          setQuestions(questionTexts);
          setRecordings(questionTexts.map(() => ({ blob: null, url: null })));
        }
        // Handle object response format
        else if (
          response &&
          typeof response === "object" &&
          Object.keys(response).length > 0
        ) {
          const questionObjects = Object.values(response);
          const sortedQuestions = [...questionObjects].sort(
            (a, b) =>
              (a as { order: number }).order - (b as { order: number }).order
          );
          const questionTexts = sortedQuestions.map((q) => (q as { question: string }).question);
          setQuestions(questionTexts);
          setRecordings(questionTexts.map(() => ({ blob: null, url: null })));
        }
        // No valid question format found
        else {
          console.log("No valid question format found in:", response);
          setError("No questions found for this interview");
        }
      } catch (err) {
        console.error("Failed to fetch interview questions:", err);
        setError("Failed to load interview questions");
      } finally {
        // Always set loading to false when done
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId]);

  // ... keep existing code (auto-recording countdown effect hook)
  
  useEffect(() => {
    // If current question already has a recording
    if (recordings[currentQuestion]?.url) {
      setHasCurrentQuestionBeenAnswered(true);
      setShowingCountdown(false);
    }
    // If no recording exists yet
    else {
      setHasCurrentQuestionBeenAnswered(false);
      // Reset and show countdown
      setAutoRecordCountdown(AUTO_RECORD_DELAY);
      setShowingCountdown(true);

      // Clear any existing countdown timer
      if (autoRecordTimerRef.current) {
        clearInterval(autoRecordTimerRef.current);
      }

      // Start new countdown timer
      autoRecordTimerRef.current = window.setInterval(() => {
        setAutoRecordCountdown((prev) => {
          const newCount = prev - 1;
          // When countdown reaches zero
          if (newCount <= 0) {
            clearInterval(autoRecordTimerRef.current!);
            setShowingCountdown(false);

            // Auto-start recording if conditions are met
            if (
              !isRecording &&
              !recordings[currentQuestion]?.url &&
              activeCall
            ) {
              startRecording();
            }
            return 0;
          }
          return newCount;
        });
      }, 1000);
    }

    // Cleanup timer on unmount or question change
    return () => {
      if (autoRecordTimerRef.current) {
        clearInterval(autoRecordTimerRef.current);
      }
    };
  }, [currentQuestion, recordings, isRecording, activeCall]);

  // ... keep existing code (progress calculations and startRecording, stopRecording, handleNext, endCall functions)
  
  // Calculate progress percentage through questions
  const progress =
    questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // Calculate time remaining in current recording
  const timeRemaining = MAX_RECORDING_TIME - recordingTime;
  const timeRemainingPercentage = (timeRemaining / MAX_RECORDING_TIME) * 100;

  /**
   * Start recording the user's answer
   * - Requests microphone access
   * - Sets up MediaRecorder with event handlers
   * - Manages recording state and timer
   */
  const startRecording = async () => {
    // Cancel any auto-recording countdown
    if (autoRecordTimerRef.current) {
      clearInterval(autoRecordTimerRef.current);
      setShowingCountdown(false);
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle incoming audio data
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Handle recording completion
      mediaRecorder.onstop = () => {
        // Create blob from audio chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Store recording in state
        const newRecordings = [...recordings];
        newRecordings[currentQuestion] = { blob: audioBlob, url: audioUrl };
        setRecordings(newRecordings);

        // Mark question as answered
        setHasCurrentQuestionBeenAnswered(true);
        setRecordingTime(0);
      };

      // Start the recording
      mediaRecorder.start();
      setIsRecording(true);

      // Start timer to track recording duration
      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds++;
        setRecordingTime(seconds);

        // Auto-stop if max recording time is reached
        if (seconds >= MAX_RECORDING_TIME) {
          stopRecording();
          toast({
            title: "Time's up!",
            description: "Your 1.5 minute answer time has ended.",
          });
        }
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your answers.",
        variant: "destructive",
      });
    }
  };

  /**
   * Stop the current recording
   * - Stops MediaRecorder
   * - Releases microphone access
   * - Clears recording timer
   */
  const stopRecording = () => {
    // Only proceed if there's an active recorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      // Stop recording
      mediaRecorderRef.current.stop();
      // Release microphone
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);

      // Clear recording timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Notify user
      toast({
        title: "Answer Recorded",
        description: "Your answer has been successfully recorded.",
      });
    }
  };

  /**
   * Handle next question button click
   * - Enforces that an answer must be recorded
   * - Stops any active recording
   * - Advances to next question or completes interview
   */
  const handleNext = () => {
    // Prevent advancing if no answer recorded
    if (!hasCurrentQuestionBeenAnswered) {
      toast({
        title: "Record Answer Required",
        description:
          "Please record your answer before moving to the next question.",
        variant: "destructive",
      });
      return;
    }

    // Stop recording if in progress
    if (isRecording) {
      stopRecording();
    }

    // Advance to next question or end interview
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((current) => current + 1);
    } else {
      // Handle interview completion
      toast({
        title: "Interview Complete",
        description:
          "All questions have been answered. Preparing your feedback...",
      });
    }

    // Clear any auto-record timer
    if (autoRecordTimerRef.current) {
      clearInterval(autoRecordTimerRef.current);
    }
  };

  /**
   * End the current interview session
   * - Stops any active recording
   * - Sets interview state to inactive
   */
  const endCall = () => {
    if (isRecording) {
      stopRecording();
    }
    setActiveCall(false);
    toast({
      title: "Interview Ended",
      description: "You've ended the interview session.",
    });
  };

  // ... keep existing code (cleanup effect hook)
  
  useEffect(() => {
    return () => {
      // Stop recording if in progress
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      // Clear recording timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Release object URLs to prevent memory leaks
      recordings.forEach((recording) => {
        if (recording.url) {
          URL.revokeObjectURL(recording.url);
        }
      });
    };
  }, [recordings]);

  /**
   * Format seconds into MM:SS display format
   * @param seconds Number of seconds to format
   * @returns Formatted time string (e.g., "01:30")
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Display loading state while fetching questions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center animate-fade-up">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-heading">Loading your interview questions...</p>
        </div>
      </div>
    );
  }

  // Display error state if loading failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md animate-fade-up border-destructive/50">
          <CardContent className="pt-6">
            <h3 className="text-destructive font-medium text-lg mb-2">Error</h3>
            <p className="text-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main interview interface
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>Interview Session - Interviewly</title>
        <meta
          name="description"
          content="Practice interview questions and record your answers with Interviewly."
        />
      </Head>

      <main className="flex-grow container mx-auto px-4 py-8 mt-6 md:mt-10">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-center mb-6 text-foreground text-primary">
            Interview Session
          </h1>
          
          {/* Video Call Interface Container */}
          <Card className="mb-6 overflow-hidden border-2 border-primary/10 shadow-lg">
            {/* Call Header - Shows status and end call button */}
            <div className="bg-primary p-3 flex justify-between items-center">
              <div className="flex items-center">
                <Video className="h-5 w-5 text-primary-foreground mr-2" />
                <span className="text-primary-foreground font-medium">
                  Interview Session
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-primary-foreground/90 text-sm flex items-center">
                  <div className={`h-2 w-2 rounded-full ${activeCall ? 'bg-green-400' : 'bg-red-400'} mr-1`}></div>
                  {activeCall ? "Active" : "Call Ended"}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={endCall}
                  className="h-8 text-red-600">
                  End Call
                </Button>

              </div>
            </div>

            {/* Question Display and Interaction Area */}
            <div className="p-6 bg-card text-card-foreground">
              {/* Interviewer Avatar and Question */}
              <div className="flex items-start mb-6">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src="" alt="Interviewer" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4 flex-1">
                  <div className="font-medium text-foreground">Interviewer</div>
                  <div className="mt-3 bg-gray-100 p-4 rounded-lg rounded-tl-none border border-gray-100">
                    <MessageSquare className="h-5 w-5 text-primary mb-2" />
                    {/* Current question text */}
                    <p className="text-secondary-foreground text-lg">
                      {questions[currentQuestion]}
                    </p>
                    {/* Auto-recording countdown notification */}
                    {showingCountdown && autoRecordCountdown > 0 && (
                      <div className="mt-4 bg-gray-50 border border-gray-100 rounded-md p-3 flex items-center">
                        <Clock className="h-5 w-5 text-gray-900 mr-2 flex-shrink-0" />
                        <p className="text-gray-900 text-sm">
                          Recording will start automatically in{" "}
                          <span className="font-semibold">{autoRecordCountdown}</span> seconds
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User's Answer Section */}
              <div className="flex items-start mt-6">
                <div className="flex-grow">
                  {/* Display recorded answer if available */}
                  {recordings[currentQuestion]?.url ? (
                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-100">
                      <h3 className="text-secondary-foreground font-medium mb-3">
                        Your Answer:
                      </h3>
                      <audio
                        src={recordings[currentQuestion].url || ""}
                        controls
                        className="w-full"
                      />


                    </div>
                  ) : (
                    // Placeholder when no recording exists
                    <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-green-100 flex items-center justify-center h-20">
                      <p className="text-muted-foreground text-center">
                        {isRecording
                          ? "Recording your answer..."
                          : "Click 'Record Answer' below to respond"}
                      </p>
                    </div>
                  )}
                </div>
                {/* User Avatar */}
                <Avatar className="h-12 w-12 border-2 border-accent ml-4">
                  <AvatarImage src="" alt="You" />
                  <AvatarFallback className="bg-accent/10 text-accent">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>


            {/* Recording Controls Section */}
            <div className="bg-muted p-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Recording Progress Bar */}
                {isRecording && (
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Time remaining: {formatTime(timeRemaining)}</span>
                      <span>Max: 1:30</span>
                    </div>
                    <Progress
                      value={timeRemainingPercentage}
                      className="h-2 bg-secondary"
                    />
                  </div>
                )}
                {/* Recording Status Indicator */}
                <div className="flex items-center gap-2 text-foreground">
                  {isRecording ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-destructive animate-pulse"></div>
                      <span className="text-sm">
                        Recording... {formatTime(recordingTime)}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Recording Control Buttons */}
                <div className="flex items-center gap-3">
                  {isRecording ? (
                    <Button
                      variant="destructive"
                      onClick={stopRecording}>
                      <StopCircle className="h-5 w-5 mr-2" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={startRecording}
                      disabled={!activeCall}>
                      <Mic className="h-5 w-5 mr-2" />
                      {/* Dynamically change button text based on recording status */}
                      {recordings[currentQuestion]?.url
                        ? "Record Again"
                        : "Record Answer"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Overall Progress Indicator */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="pt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Navigation Button - Next Only */}
          <div className="flex justify-end mb-10">
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
              disabled={
                !activeCall || !hasCurrentQuestionBeenAnswered || isRecording
              }>
              {/* Dynamically change button text on last question */}
              {currentQuestion === questions.length - 1
                ? "Finish"
                : "Next Question"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Interview;
