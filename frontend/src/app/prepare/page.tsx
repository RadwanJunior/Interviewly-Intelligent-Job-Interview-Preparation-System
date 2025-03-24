"use client";
import React, { useEffect, useState } from "react";
import Navigate from "next/link";
import Head from "next/head";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useWorkflow } from "@/context/WorkflowContext";

const PrepareInterview = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const { jobDetailsData } = useWorkflow();

  // Mock generation progress - in a real app this would be updated from a backend call
  useEffect(() => {
    const simulateGeneration = () => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            setIsGenerating(false);
            return 100;
          }
          return newProgress;
        });
      }, 600); // Updates every 600ms to simulate generation

      return () => clearInterval(interval);
    };

    simulateGeneration();
  }, []);

  const handleStart = () => {
    if (isGenerating) {
      toast({
        title: "Please wait",
        description: "We're still preparing your interview questions.",
        variant: "destructive",
      });
      return;
    }

    // Start the interview
    return <Navigate href="/interview" />;
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
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Prepare for Your Interview
              </h1>
              <p className="text-lg text-gray-600">
                We're setting up your personalized interview based on your
                resume and job description.
              </p>
            </div>

            {/* Generation Status */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Generating questions</span>
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
                    <span>Your interview is ready!</span>
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
                  <span>Prepare water or a drink nearby.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>You'll have 1.5 minutes for each answer.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Speak clearly and at a moderate pace.</span>
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
                  you're ready before proceeding.
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
                {isGenerating ? "Preparing Questions..." : "Start Interview"}
              </Button>
            </div>
          </Card>
        </div>
        <div>
          <h1>Prepare Interview</h1>
          <pre>{JSON.stringify(jobDetailsData, null, 2)}</pre>
        </div>
      </main>
    </div>
  );
};

export default PrepareInterview;
