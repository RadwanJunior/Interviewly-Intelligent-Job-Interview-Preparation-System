// src/app/interview/page.tsx
"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Head from "next/head";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { getInterviewQuestions, uploadAudio, triggerFeedbackGeneration } from "@/lib/api";
import { Recording } from "../../components/interview/types";
import {
  LoadingState,
  ErrorState,
} from "../../components/interview/LoadingStates";
import { InterviewHeader } from "../../components/interview/InterviewHeader";
import { QuestionDisplay } from "../../components/interview/QuestionDisplay";
import { AnswerSection } from "../../components/interview/AnswerSection";
import { RecordingControls } from "../../components/interview/RecordingControls";
import { ProgressIndicator } from "../../components/interview/ProgressIndicator";
import { InterviewNavigation } from "../../components/interview/InterviewNavigation";

/**
 * Constants for timing controls in the interview
 */
const MAX_RECORDING_TIME = 90;
const AUTO_RECORD_DELAY = 30;

/**
 * Interview Component - Handles the mock interview session flow
 */
const InterviewContent = () => {
  // Get session ID from URL query parameters
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { toast } = useToast();

  // ===== STATE MANAGEMENT =====
  // Question and loading states
  const [questions, setQuestions] = useState<
    { id: string; question: string; order: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  // Uploading Status
  const [isUploading, setIsUploading] = useState(false);

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const autoRecordTimerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(0);

  // Fetch questions when component loads
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!sessionId) {
        setError("No interview session ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await getInterviewQuestions(sessionId);

        if (response && Array.isArray(response.questions)) {
          const sortedQuestions = [...response.questions].sort(
            (a, b) => a.order - b.order
          );
          const questionObjects = sortedQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            order: q.order,
          }));
          setQuestions(questionObjects);
          setRecordings(
            questionObjects.map(() => ({
              blob: null,
              url: null,
              mimeType: null,
            }))
          );
        } else if (response && Array.isArray(response)) {
          const sortedQuestions = [...response].sort(
            (a, b) => a.order - b.order
          );
          const questionObjects = sortedQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            order: q.order,
          }));
          setQuestions(questionObjects);
          setRecordings(
            questionObjects.map(() => ({
              blob: null,
              url: null,
              mimeType: null,
            }))
          );
        } else if (
          response &&
          typeof response === "object" &&
          Object.keys(response).length > 0
        ) {
          const questionObjects = Object.values(response);
          const sortedQuestions = [...questionObjects].sort(
            (a, b) =>
              (a as { order: number }).order - (b as { order: number }).order
          );
          const mappedQuestions = sortedQuestions.map((q) => ({
            id: (q as { id: string }).id,
            question: (q as { question: string }).question,
            order: (q as { order: number }).order,
          }));
          setQuestions(mappedQuestions);
          setRecordings(
            mappedQuestions.map(() => ({
              blob: null,
              url: null,
              mimeType: null,
            }))
          );
        } else {
          console.log("No valid question format found in:", response);
          setError("No questions found for this interview");
        }
      } catch (err) {
        console.error("Failed to fetch interview questions:", err);
        setError("Failed to load interview questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      recordingSecondsRef.current = 0;

      toast({
        title: "Answer Recorded",
        description: "Your answer has been successfully recorded.",
      });
    }
  }, [toast]);

  // Start recording function
  const startRecording = useCallback(async () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoRecordTimerRef.current) {
      clearInterval(autoRecordTimerRef.current);
      autoRecordTimerRef.current = null;
    }

    setRecordingTime(0);
    setShowingCountdown(false);
    audioChunksRef.current = [];
    recordingSecondsRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        if (track.muted) {
          console.warn("Audio track is muted at the source!");
          toast({
            title: "Microphone Muted",
            description: "Your microphone seems to be muted at the source.",
            variant: "destructive",
          });
        }
      } else {
        console.error("No audio tracks found in the stream!");
        toast({
          title: "No Audio Track",
          description: "Could not find an audio track from your microphone.",
          variant: "destructive",
        });
        return;
      }

      let options: MediaRecorderOptions = {};
      let chosenMimeType = "audio/webm"; // Default fallback, but try more specific first

      // Attempt to use Opus codec for WebM
      if (MediaRecorder.isTypeSupported("audio/webm; codecs=opus")) {
        options = { mimeType: "audio/webm; codecs=opus" };
        chosenMimeType = "audio/webm; codecs=opus";
        console.log("Using audio/webm with Opus codec.");
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        // Fallback to default WebM if Opus codec isn't explicitly supported
        options = { mimeType: "audio/webm" };
        chosenMimeType = "audio/webm";
        console.log("Using default audio/webm codec.");
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        // Fallback to MP4 (AAC) if WebM is not supported at all
        options = { mimeType: "audio/mp4" };
        chosenMimeType = "audio/mp4";
        console.log("Using audio/mp4 (AAC) codec.");
      } else {
        // Last resort: find any supported audio type
        const supportedTypes = [
          "audio/ogg",
          "audio/wav",
          // Add more if necessary, but keep it concise for common browsers
        ];
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            options = { mimeType: type };
            chosenMimeType = type;
            console.log(`Using fallback audio type: ${type}`);
            break;
          }
        }
        if (!chosenMimeType) {
          console.error("No supported audio mimeType found for MediaRecorder.");
          toast({
            title: "Recording Error",
            description:
              "Your browser does not support any compatible audio recording formats.",
            variant: "destructive",
          });
          stream.getTracks().forEach((track) => track.stop()); // Stop the stream
          return; // Exit if no type is supported
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options); // Pass the options here
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Store the chosen MIME type to be used when creating the Blob and File
      const currentQuestionMimeType = chosenMimeType;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("Chunks:", audioChunksRef.current);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: currentQuestionMimeType, // Use the dynamically chosen MIME type
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings((prev) => {
          const updated = [...prev];
          // Store mimeType with the recording object
          updated[currentQuestion] = {
            blob: audioBlob,
            url: audioUrl,
            mimeType: currentQuestionMimeType,
          };
          return updated;
        });
        setHasCurrentQuestionBeenAnswered(true);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingTime(recordingSecondsRef.current);

        if (recordingSecondsRef.current >= MAX_RECORDING_TIME) {
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
  }, [currentQuestion, stopRecording, toast]);

  // Auto-recording countdown effect
  useEffect(() => {
    if (isRecording) {
      setShowingCountdown(false);
      return;
    }

    if (recordings[currentQuestion]?.url) {
      setHasCurrentQuestionBeenAnswered(true);
      setShowingCountdown(false);
    } else {
      setHasCurrentQuestionBeenAnswered(false);
      setAutoRecordCountdown(AUTO_RECORD_DELAY);
      setShowingCountdown(true);

      if (autoRecordTimerRef.current) {
        clearInterval(autoRecordTimerRef.current);
      }

      autoRecordTimerRef.current = window.setInterval(() => {
        setAutoRecordCountdown((prev) => {
          const newCount = prev - 1;
          if (newCount <= 0) {
            clearInterval(autoRecordTimerRef.current!);
            setShowingCountdown(false);

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

    return () => {
      if (autoRecordTimerRef.current) {
        clearInterval(autoRecordTimerRef.current);
      }
    };
  }, [currentQuestion, recordings, isRecording, activeCall, startRecording]);

  // Calculate progress percentage
  const progress =
    questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // Calculate time remaining
  const timeRemaining = MAX_RECORDING_TIME - recordingTime;
  const timeRemainingPercentage = (timeRemaining / MAX_RECORDING_TIME) * 100;

  // Handle next button click
  const handleNext = async () => {
    if (isUploading) return;
    if (!hasCurrentQuestionBeenAnswered) {
      toast({
        title: "Record Answer Required",
        description:
          "Please record your answer before moving to the next question.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    const recording = recordings[currentQuestion];
    if (!recording?.blob || !recording?.mimeType) {
      toast({
        title: "No Recording Found",
        description: "Please record your answer before proceeding.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Extract a suitable file extension (e.g., "webm", "mp4")
      const fileExtension = recording.mimeType.split("/")[1].split(";")[0];

      // Create a File from the Blob for upload, using the dynamically determined MIME type
      const file = new File(
        [recording.blob],
        `answer_${currentQuestion}.${fileExtension}`, // Use correct extension based on chosen mimeType
        {
          type: recording.mimeType,
        }
      );

      await uploadAudio({
        file: file,
        interview_id: sessionId!,
        question_id: questions[currentQuestion]?.id,
        question_text: questions[currentQuestion]?.question,
        question_order: currentQuestion,
        is_last_question: currentQuestion === questions.length - 1,
      });

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((current) => current + 1);
      } else {
        toast({
          title: "Interview Complete",
          description:
            "All questions have been answered. Preparing your feedback...",
        });
        // Trigger feedback generation and redirect to feedback page for text interview
        setActiveCall(false);
        if (!sessionId) {
          toast({
            title: "Error",
            description: "No session ID found. Please start the interview again.",
            variant: "destructive",
          });
          return;
        }
        try {
          await triggerFeedbackGeneration(sessionId);
          window.location.href = `/Feedback?sessionId=${sessionId}&type=text`;
        } catch (error) {
          console.error("Error triggering feedback generation:", error);
          toast({
            title: "Error",
            description: "Failed to start feedback generation. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Upload Failed",
        description:
          "There was an error uploading your answer. Please try again.",
        variant: "destructive",
      });
      console.error("Audio upload error:", err);
    } finally {
      setIsUploading(false);
    }

    if (autoRecordTimerRef.current) {
      clearInterval(autoRecordTimerRef.current);
    }
  };

  // End interview call function
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

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      recordings.forEach((recording) => {
        if (recording.url) {
          URL.revokeObjectURL(recording.url);
        }
      });
    };
  }, [recordings]);

  // Display loading state
  if (loading) {
    return <LoadingState />;
  }

  // Display error state
  if (error) {
    return <ErrorState message={error} />;
  }

  // Main interview interface
  return (
    <Suspense fallback={<LoadingState message="Loading interview..." />}>
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

            {/* Interview Interface Card */}
            <Card className="mb-6 overflow-hidden border-2 border-primary/10 shadow-lg">
              <InterviewHeader activeCall={activeCall} onEndCall={endCall} />

              <div className="p-6 bg-card text-card-foreground">
                <QuestionDisplay
                  question={questions[currentQuestion]?.question}
                  showingCountdown={showingCountdown}
                  autoRecordCountdown={autoRecordCountdown}
                />

                <AnswerSection
                  recording={recordings[currentQuestion]}
                  isRecording={isRecording}
                />
              </div>

              <RecordingControls
                isRecording={isRecording}
                activeCall={activeCall}
                hasRecording={!!recordings[currentQuestion]?.url}
                recordingTime={recordingTime}
                timeRemaining={timeRemaining}
                timeRemainingPercentage={timeRemainingPercentage}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
              />
            </Card>

            <ProgressIndicator
              currentQuestion={currentQuestion}
              totalQuestions={questions.length}
              progress={progress}
            />

            <InterviewNavigation
              isLastQuestion={currentQuestion === questions.length - 1}
              activeCall={activeCall}
              hasCurrentQuestionBeenAnswered={hasCurrentQuestionBeenAnswered}
              isRecording={isRecording}
              isUploading={isUploading}
              onNext={handleNext}
            />
          </div>
        </main>
      </div>
    </Suspense>
  );
};

const Interview = () => (
  <Suspense fallback={<div className="p-6">Loading interview...</div>}>
    <InterviewContent />
  </Suspense>
);

export default Interview;
