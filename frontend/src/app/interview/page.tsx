"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Head from "next/head";
import {
  Mic,
  StopCircle,
  ArrowRight,
  ArrowLeft,
  Video,
  User,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInterviewQuestions } from "@/lib/api";

// Maximum recording time in seconds (1.5 minutes)
const MAX_RECORDING_TIME = 90;

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
          // If response is an object with numeric keys (like an array-like object)
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

  // Calculate progress percentage
  const progress =
    questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // Calculate time remaining (for timer progress)
  const timeRemaining = MAX_RECORDING_TIME - recordingTime;
  const timeRemainingPercentage = (timeRemaining / MAX_RECORDING_TIME) * 100;

  const startRecording = async () => {
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

        // Update recordings array with new recording
        const newRecordings = [...recordings];
        newRecordings[currentQuestion] = { blob: audioBlob, url: audioUrl };
        setRecordings(newRecordings);

        // Reset recording time
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer for recording duration
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

      // Clear timer
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
    // If recording is in progress, stop it first
    if (isRecording) {
      stopRecording();
    }

    // Move to next question if not at the end
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((current) => current + 1);
    } else {
      // Handle completion of all questions
      toast({
        title: "Interview Complete",
        description:
          "All questions have been answered. Preparing your feedback...",
      });
      // In a real app, navigate to a results/feedback page
      // router.push('/feedback');
    }
  };

  const handlePrevious = () => {
    // If recording is in progress, stop it first
    if (isRecording) {
      stopRecording();
    }

    // Move to previous question if not at the beginning
    if (currentQuestion > 0) {
      setCurrentQuestion((current) => current - 1);
    }
  };

  // End the interview session
  const endCall = () => {
    if (isRecording) {
      stopRecording();
    }
    setActiveCall(false);
    toast({
      title: "Interview Ended",
      description: "You've ended the interview session.",
    });
    // In a real app, navigate away and show a summary
    // For now, we'll just set the state to reflect the call has ended
  };

  // Cleanup function for when component unmounts
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

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Revoke all object URLs
      recordings.forEach((recording) => {
        if (recording.url) {
          URL.revokeObjectURL(recording.url);
        }
      });
    };
  }, [recordings]);

  // Format seconds to MM:SS
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
          {/* Video Call Interface */}
          <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl mb-4">
            {/* Call Header */}
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

            {/* Interviewer and Question Display */}
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
                  </div>
                </div>
              </div>

              {/* Your Answer Section */}
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

            {/* Recording Controls and Progress */}
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
                      Record Answer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Progress */}
          <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0 || !activeCall}
              className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              disabled={!activeCall}>
              {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Interview;
