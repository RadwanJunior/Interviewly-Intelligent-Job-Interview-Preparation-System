"use client";
import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/context/WorkflowContext";
// Remove getInterviewStatus as it's no longer needed
import { createInterviewSession } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

const PrepareInterview = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(true);
  // Remove the progress state
  // const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [isEnhancementComplete, setIsEnhancementComplete] = useState(false);
  const { jobDetailsData } = useWorkflow();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewType = searchParams.get("type") || "text";
  const isRequestInProgress = useRef(false);

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
          // Once the session is created, we're ready. Stop the loading state.
          setIsGenerating(false);
        } else {
          toast({
            title: "Error",
            description: "Could not create interview session.",
            variant: "destructive",
          });
          // Also stop loading on error
          setIsGenerating(false);
        }
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: `Error creating interview session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
        setIsGenerating(false);
      }
      // No finally block needed as we handle isGenerating in each path
    };

    // Add a polling function
    let intervalId: NodeJS.Timeout;

    const checkEnhancementStatus = async () => {
      if (!sessionId || isEnhancementComplete) return;

      try {
        const response = await fetch(`/api/interview/status/${sessionId}`);
        const data = await response.json();

        if (data.status === "ready" || data.enhanced_prompt_available) {
          setIsEnhancementComplete(true);
          setIsGenerating(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error checking interview status:", error);
      }
    };

    if (sessionId && !isEnhancementComplete) {
      // Poll every 3 seconds
      intervalId = setInterval(checkEnhancementStatus, 3000);
      // Initial check
      checkEnhancementStatus();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    jobDetailsData,
    toast,
    interviewType,
    router,
    sessionId,
    isEnhancementComplete,
  ]);

  const handleStart = () => {
    if (isGenerating || !isEnhancementComplete) {
      toast({
        title: "Please wait",
        description:
          "We're still enhancing your interview questions with relevant data.",
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

            {/* Generation Status */}
            <div className="mb-8">
              <div className="flex justify-center mt-4">
                {isGenerating ? (
                  <div className="flex items-center text-yellow-600">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>
                      {isEnhancementComplete
                        ? "Interview questions ready!"
                        : "Enhancing your questions with relevant data..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Interview questions are ready!</span>
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
                  isGenerating
                    ? "bg-gray-400"
                    : "bg-primary hover:bg-primary/90"
                }`}
                disabled={isGenerating || !isEnhancementComplete}>
                {isGenerating ? "Preparing Questions..." : "Start Interview"}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PrepareInterview;
