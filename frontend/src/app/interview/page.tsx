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
  AlertCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInterviewQuestions } from "@/lib/api";

// Maximum recording time in seconds (1.5 minutes)
const MAX_RECORDING_TIME = 90;
// Time before auto-starting recording (30 seconds)
const AUTO_RECORD_DELAY = 30;

const Interview = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { toast } = useToast();

  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<
    Array<{ blob: Blob | null; url: string | null }>
  >([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [activeCall, setActiveCall] = useState(true);

  // Add state for auto-recording countdown
  const [autoRecordCountdown, setAutoRecordCountdown] =
    useState(AUTO_RECORD_DELAY);
  const autoRecordTimerRef = useRef<number | null>(null);
  const [showingCountdown, setShowingCountdown] = useState(false);

  // Add a state to track if the current question has been answered
  const [hasCurrentQuestionBeenAnswered, setHasCurrentQuestionBeenAnswered] =
    useState(false);

  // Fetch interview questions when the component mounts
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
          // If response has a questions property that is an array
          // Sort questions by order field before mapping to texts
          const sortedQuestions = [...response.questions].sort(
            (a, b) => a.order - b.order
          );
          const questionTexts = sortedQuestions.map((q) => q.question);
          setQuestions(questionTexts);
          setRecordings(questionTexts.map(() => ({ blob: null, url: null })));
        } else if (response && Array.isArray(response)) {
          // If response is directly an array of questions
          // Sort questions by order field before mapping to texts
          const sortedQuestions = [...response].sort(
            (a, b) => a.order - b.order
          );
          const questionTexts = sortedQuestions.map((q) => q.question);
          setQuestions(questionTexts);
          setRecordings(questionTexts.map(() => ({ blob: null, url: null })));
        } else if (
          response &&
          typeof response === "object" &&
          Object.keys(response).length > 0
        ) {
          const questionObjects = Object.values(response);
          // Sort questions by order field before mapping to texts
          const sortedQuestions = [...questionObjects].sort(
            (a: any, b: any) => a.order - b.order
          );
          const questionTexts = sortedQuestions.map((q: any) => q.question);
          setQuestions(questionTexts);
          setRecordings(questionTexts.map(() => ({ blob: null, url: null })));
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

  // Reset the answered state when changing questions and start auto-record countdown
  useEffect(() => {
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
  }, [currentQuestion, recordings, isRecording, activeCall]);

  const progress =
    questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const timeRemaining = MAX_RECORDING_TIME - recordingTime;
  const timeRemainingPercentage = (timeRemaining / MAX_RECORDING_TIME) * 100;

  const startRecording = async () => {
    if (autoRecordTimerRef.current) {
      clearInterval(autoRecordTimerRef.current);
      setShowingCountdown(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        const newRecordings = [...recordings];
        newRecordings[currentQuestion] = { blob: audioBlob, url: audioUrl };
        setRecordings(newRecordings);

        setHasCurrentQuestionBeenAnswered(true);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds++;
        setRecordingTime(seconds);

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

  const stopRecording = () => {
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

      toast({
        title: "Answer Recorded",
        description: "Your answer has been successfully recorded.",
      });
    }
  };

  const handleNext = () => {
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

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((current) => current + 1);
    } else {
      toast({
        title: "Interview Complete",
        description:
          "All questions have been answered. Preparing your feedback...",
      });
    }

    if (autoRecordTimerRef.current) {
      clearInterval(autoRecordTimerRef.current);
    }
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4">Loading your interview questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-md border border-red-200 max-w-md">
          <h3 className="text-red-600 font-medium mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Head>
        <title>Interview Session - Interviewly</title>
        <meta
          name="description"
          content="Practice interview questions and record your answers with Interviewly."
        />
      </Head>

      <main className="flex-grow container mx-auto px-4 py-8 mt-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl mb-4">
            <div className="bg-gray-800 p-3 flex justify-between items-center">
              <div className="flex items-center">
                <Video className="h-5 w-5 text-primary mr-2" />
                <span className="text-white font-medium">
                  Interview Session
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400 text-sm flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-400 mr-1"></div>
                  {activeCall ? "Active" : "Call Ended"}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={endCall}
                  className="h-8">
                  End Call
                </Button>
              </div>
            </div>

            <div className="p-6 bg-gray-900 text-gray-100">
              <div className="flex items-start mb-6">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src="" alt="Interviewer" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4">
                  <div className="font-medium text-gray-100">Interviewer</div>
                  <div className="mt-3 bg-gray-800 p-4 rounded-lg rounded-tl-none">
                    <MessageSquare className="h-5 w-5 text-primary mb-2" />
                    <p className="text-gray-100 text-lg">
                      {questions[currentQuestion]}
                    </p>
                    {showingCountdown && autoRecordCountdown > 0 && (
                      <div className="mt-4 bg-blue-900/30 border border-blue-700/50 rounded-md p-3 flex items-center">
                        <Clock className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                        <p className="text-blue-300 text-sm">
                          Recording will start automatically in{" "}
                          {autoRecordCountdown} seconds
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start mt-6">
                <div className="flex-grow">
                  {recordings[currentQuestion]?.url ? (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-gray-300 font-medium mb-3">
                        Your Answer:
                      </h3>
                      <audio
                        src={recordings[currentQuestion].url || ""}
                        controls
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-dashed border-gray-700 flex items-center justify-center">
                      <p className="text-gray-400 text-center">
                        {isRecording
                          ? "Recording your answer..."
                          : "Click 'Record Answer' below to respond"}
                      </p>
                    </div>
                  )}
                </div>
                <Avatar className="h-12 w-12 border-2 border-accent ml-4">
                  <AvatarImage src="" alt="You" />
                  <AvatarFallback className="bg-accent/10 text-accent">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="bg-gray-800 p-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {isRecording && (
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Time remaining: {formatTime(timeRemaining)}</span>
                      <span>Max: 1:30</span>
                    </div>
                    <Progress
                      value={timeRemainingPercentage}
                      className="h-2 bg-gray-700"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 text-white">
                  {isRecording ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-sm">
                        Recording... {formatTime(recordingTime)}
                      </span>
                    </>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  {isRecording ? (
                    <Button
                      variant="secondary"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 text-white">
                      <StopCircle className="h-5 w-5 mr-2" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={startRecording}
                      className="bg-primary hover:bg-primary/90"
                      disabled={!activeCall}>
                      <Mic className="h-5 w-5 mr-2" />
                      {recordings[currentQuestion]?.url
                        ? "Record Again"
                        : "Record Answer"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              className={`flex items-center gap-2 ${
                hasCurrentQuestionBeenAnswered
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-gray-400"
              }`}
              disabled={
                !activeCall || !hasCurrentQuestionBeenAnswered || isRecording
              }>
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
