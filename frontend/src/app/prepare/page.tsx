"use client";
import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Search,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/context/WorkflowContext";
import { createInterviewSession } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

// Status enum matching backend RAGStatus
enum InterviewStatus {
  NOT_STARTED = "not_started",
  ENHANCING = "enhancing",
  VECTOR_SEARCH = "vector_search",
  WEB_SCRAPING = "web_scraping",
  PROCESSING = "processing",
  READY = "ready",
  FAILED = "failed",
  TIMEOUT = "timeout",
}

const PrepareInterview = () => {
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState<string>(
    InterviewStatus.NOT_STARTED
  );
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
  const [sessionId, setSessionId] = useState("");
  const [hasError, setHasError] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const { jobDetailsData } = useWorkflow();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewType = searchParams.get("type") || "text";
  const isRequestInProgress = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case InterviewStatus.ENHANCING:
        return { icon: Sparkles, color: "text-blue-600", spin: true };
      case InterviewStatus.VECTOR_SEARCH:
        return { icon: Search, color: "text-purple-600", spin: true };
      case InterviewStatus.WEB_SCRAPING:
        return { icon: Globe, color: "text-green-600", spin: true };
      case InterviewStatus.PROCESSING:
        return { icon: Loader2, color: "text-yellow-600", spin: true };
      case InterviewStatus.READY:
        return { icon: CheckCircle, color: "text-green-600", spin: false };
      case InterviewStatus.FAILED:
      case InterviewStatus.TIMEOUT:
        return { icon: AlertCircle, color: "text-red-600", spin: false };
      default:
        return { icon: Loader2, color: "text-gray-600", spin: true };
    }
  };

  const isReady = currentStatus === InterviewStatus.READY;
  const isFailed =
    currentStatus === InterviewStatus.FAILED ||
    currentStatus === InterviewStatus.TIMEOUT;

  // Create interview session on mount
  useEffect(() => {
    const startGeneration = async () => {
      if (isRequestInProgress.current || !jobDetailsData?.JobDescriptionId)
        return;
      isRequestInProgress.current = true;

      try {
        const response = await createInterviewSession({
          job_description_id: jobDetailsData.JobDescriptionId,
          type: interviewType as "text" | "call",
        });

        if (response.session && response.session.id) {
          setSessionId(response.session.id);
          setCurrentStatus(InterviewStatus.ENHANCING);
          setStatusMessage("Enhancing your interview questions...");
        } else {
          toast({
            title: "Error",
            description: "Could not create interview session.",
            variant: "destructive",
          });
          setHasError(true);
          setCurrentStatus(InterviewStatus.FAILED);
          setStatusMessage("Failed to create interview session");
        }
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: `Error creating interview session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
        setHasError(true);
        setCurrentStatus(InterviewStatus.FAILED);
        setStatusMessage("Failed to create interview session");
      }
    };

    if (!isRequestInProgress.current) {
      startGeneration();
    }
  }, [jobDetailsData, toast, interviewType]);

  // Poll for status updates
  useEffect(() => {
    const MAX_POLLING_ATTEMPTS = 40; // 40 attempts * 3 seconds = 2 minutes
    let attempts = 0;

    const checkStatus = async () => {
      if (!sessionId) return;

      attempts++;

      if (attempts >= MAX_POLLING_ATTEMPTS) {
        setStatusMessage("The request timed out. Please try again later.");
        setCurrentStatus(InterviewStatus.TIMEOUT);
        setHasError(true);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }

      try {
        const response = await fetch(`/api/interview/status/${sessionId}`);
        if (!response.ok) {
          console.warn(`Status check failed: ${response.statusText}`);
          return; // Don't stop polling on a single failed request
        }
        const data = await response.json();

        if (data.status) {
          setCurrentStatus(data.status);
          setStatusMessage(data.message || "Processing...");

          const isTerminalStatus =
            data.status === InterviewStatus.READY ||
            data.status === InterviewStatus.FAILED ||
            data.status === InterviewStatus.TIMEOUT;

          if (isTerminalStatus) {
            if (data.status !== InterviewStatus.READY) {
              setHasError(true);
            }
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error("Error checking interview status:", error);
      }
    };

    if (sessionId && !isReady && !isFailed) {
      // Clear any existing interval before starting a new one
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Start polling
      pollIntervalRef.current = setInterval(checkStatus, 3000);
    }

    // Cleanup function to clear interval on component unmount or when status is terminal
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [sessionId, isReady, isFailed]);

  const handleStart = () => {
    if (!isReady && !isFailed) {
      toast({
        title: "Please wait",
        description:
          statusMessage || "We're still preparing your interview questions.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to the correct interview page based on type
    if (interviewType === "call") {
      router.push(`/InterviewCall?sessionId=${sessionId}`);
    } else {
      router.push(`/Interview?sessionId=${sessionId}`);
    }
  };

  const statusDisplay = getStatusDisplay(currentStatus);
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Head>
        <title>Prepare for Your Interview - Interviewly</title>
        <meta
          name="description"
          content="Get ready for your AI-powered interview session with Interviewly."
        />
      </Head>
      <main className="flex-grow container mx-auto px-4 py-8 mt-10">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 shadow-lg">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-4">
                Prepare for Your Interview
              </h1>
              <p className="text-lg text-gray-600">
                We&apos;re setting up your personalized interview based on your
                resume and job description.
              </p>
            </div>

            {/* Enhanced Status Display */}
            <div className="mb-8">
              <div className="flex flex-col items-center space-y-4">
                {/* Status Icon and Message */}
                <div className={`flex items-center ${statusDisplay.color}`}>
                  <StatusIcon
                    className={`h-6 w-6 mr-2 ${
                      statusDisplay.spin ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-lg font-medium">{statusMessage}</span>
                </div>

                {/* Progress Indicator */}
                {!isReady && !isFailed && (
                  <div className="w-full max-w-md">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary animate-pulse"
                        style={{ width: "70%" }}></div>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {isReady && (
                  <div className="text-green-600 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-semibold">
                      Your personalized interview is ready!
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {isFailed && (
                  <div className="text-yellow-600 text-center bg-yellow-50 p-4 rounded-lg">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-semibold">
                      Using standard interview questions
                    </p>
                    <p className="text-sm mt-1">
                      Enhanced context wasn&apos;t available, but we&apos;ve
                      prepared quality questions for you.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preparation Tips */}
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">
                Preparation Tips
              </h2>
              <ul className="space-y-3 text-blue-700">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Find a quiet location free from distractions.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Test your microphone before starting.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Keep water nearby.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>You have 1.5 minutes for each answer.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Speak clearly and at a comfortable pace.</span>
                </li>
              </ul>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 p-4 rounded-lg flex items-start mb-8">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-700">
                <p className="font-medium">Important:</p>
                <p>
                  Once you start the interview, you cannot pause it. Make sure
                  you&apos;re ready.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleStart}
                className={`px-8 py-3 text-lg ${
                  !isReady && !isFailed
                    ? "bg-gray-400"
                    : "bg-primary hover:bg-primary/90"
                }`}
                disabled={!isReady && !isFailed}>
                {isReady
                  ? "Start Interview"
                  : isFailed
                  ? "Continue with Standard Questions"
                  : "Preparing Questions..."}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PrepareInterview;
