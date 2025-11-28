"use client";
import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  Video,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/context/WorkflowContext";
import { createInterviewSession, getInterviewStatus } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

const PrepareInterview = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const { jobDetailsData } = useWorkflow();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRequestInProgress = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get interview type from URL params
  const interviewType = searchParams.get("type") || "text";

  // Dynamic display variables
  const InterviewTypeIcon = interviewType === "call" ? Video : MessageSquare;
  const interviewTypeName = interviewType === "call" ? "Video" : "Text";

  // Check if we have job data, redirect to workflow if not
  useEffect(() => {
    if (!jobDetailsData.JobDescriptionId) {
      // No job data, redirect to workflow first
      router.push(`/Workflow?type=${interviewType}`);
      return;
    }
  }, [jobDetailsData, router, interviewType]);

  // Cleanup function to clear polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Stopped polling for interview status");
    }
  };

  useEffect(() => {
    // Don't start if we don't have job data
    if (!jobDetailsData.JobDescriptionId) {
      return;
    }

    const startGeneration = async () => {
      if (isRequestInProgress.current) return;
      isRequestInProgress.current = true;

      try {
        const response = await createInterviewSession({
          job_description_id: jobDetailsData.JobDescriptionId,
          type: interviewType as "text" | "call",
        });

        if (response.session && response.session.id) {
          setSessionId(response.session.id);
          pollStatus(response.session.id);
        } else {
          toast({
            title: "Error",
            description: "Could not create interview session.",
            variant: "destructive",
          });
        }
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: `Error creating interview session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      } finally {
        isRequestInProgress.current = false;
      }
    };

    const pollStatus = async (sessionId: string) => {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusResp = await getInterviewStatus(sessionId);

          const statusProgressMap = {
            pending: 0,
            enhancing: 25,
            processing: 75,
            ready: 100,
            failed: 0,
            timeout: 0,
            quota_exceeded: 0,
          };

          if (statusResp.status) {
            const progress = statusProgressMap[statusResp.status] || 0;
            setProgress(progress);

            if (statusResp.status === "ready") {
              setIsGenerating(false);
              stopPolling();
              toast({
                title: "Success",
                description: "Your interview questions are ready!",
                variant: "default",
              });
            } else if (
              ["failed", "timeout", "quota_exceeded"].includes(
                statusResp.status
              )
            ) {
              setIsGenerating(false);
              stopPolling();
              toast({
                title: "Error",
                description:
                  statusResp.message ||
                  "Question generation failed. Please try again.",
                variant: "destructive",
              });
            }
          }
        } catch (error: unknown) {
          console.error("Error polling status: ", error);
        }
      }, 2000);
    };

    startGeneration();

    return () => {
      stopPolling();
    };
  }, [jobDetailsData, toast, interviewType]);

  const handleStart = () => {
    if (isGenerating) {
      toast({
        title: "Please wait",
        description: "We're still preparing your interview questions.",
        variant: "destructive",
      });
      return;
    }

    stopPolling();

    // Navigate based on interview type
    if (interviewType === "call") {
      router.push(`/InterviewCall?sessionId=${sessionId}`);
    } else {
      router.push(`/interview?sessionId=${sessionId}`);
    }
  };

  const handleGoBack = () => {
    stopPolling();
    router.push("/dashboard");
  };

  // Don't render if we don't have job data (will redirect)
  if (!jobDetailsData.JobDescriptionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecting to workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Head>
        <title>
          Prepare for Your {interviewTypeName} Interview - Interviewly
        </title>
        <meta
          name="description"
          content="Get ready for your AI-powered interview session with Interviewly."
        />
      </Head>
      <main className="flex-grow container mx-auto px-4 py-8 mt-10">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={handleGoBack}
              className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <Card className="p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <InterviewTypeIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-primary mb-4">
                Prepare for Your {interviewTypeName} Interview
              </h1>
              <p className="text-lg text-gray-600">
                We&apos;re setting up your personalized interview based on your
                resume and job description using AI enhancement.
              </p>
            </div>

            {/* Generation Status */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Generating interview questions</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center mt-4">
                {isGenerating ? (
                  <div className="flex items-center text-yellow-600">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Preparing your tailored interview questions...</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>
                      Your {interviewTypeName.toLowerCase()} interview is ready!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Preparation Tips */}
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">
                Preparation Tips for {interviewTypeName} Interview
              </h2>
              <ul className="space-y-3 text-blue-700">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Find a quiet location free from distractions.</span>
                </li>
                {interviewType === "call" && (
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      Test your microphone and camera before starting.
                    </span>
                  </li>
                )}
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Keep water nearby.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    {interviewType === "call"
                      ? "You have 1.5 minutes for each spoken answer."
                      : "Take your time to craft thoughtful written responses."}
                  </span>
                </li>
                {interviewType === "call" && (
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Speak clearly and at a comfortable pace.</span>
                  </li>
                )}
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
                  isGenerating
                    ? "bg-gray-400"
                    : "bg-primary hover:bg-primary/90"
                }`}
                disabled={isGenerating}>
                {isGenerating
                  ? "Preparing Questions..."
                  : `Start ${interviewTypeName} Interview`}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PrepareInterview;
