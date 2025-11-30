"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PrepPlanLayout from "@/components/plan/PrepPlanLayout";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getPreparationPlan, getPlanStatus, triggerPlanGeneration, updateTaskCompletion } from "@/lib/api";

// Wrapper component to use Suspense
function ResultPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get("planId");

  const [status, setStatus] = useState<string>("pending");
  const [planData, setPlanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollTrigger, setPollTrigger] = useState(0); // Trigger to restart polling

  // Poll for plan status
  useEffect(() => {
    if (!planId) {
      setError("No plan ID provided");
      setLoading(false);
      return;
    }

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const statusResponse = await getPlanStatus(planId);
        const currentStatus = statusResponse.status;

        console.log(`📊 Plan status: ${currentStatus}`);
        setStatus(currentStatus);

        if (currentStatus === "ready") {
          // Plan is ready, fetch the full plan with steps
          const fullPlan = await getPreparationPlan(planId);
          setPlanData(fullPlan);
          setLoading(false);
          clearInterval(intervalId);
        } else if (currentStatus === "error") {
          setError("Failed to generate plan. Please try again.");
          setLoading(false);
          clearInterval(intervalId);
        }
        // If status is "pending" or "generating", keep polling
      } catch (err) {
        console.error("Error checking plan status:", err);
        setError("Failed to fetch plan status");
        setLoading(false);
        clearInterval(intervalId);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    intervalId = setInterval(checkStatus, 2000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [planId, pollTrigger]); // Added pollTrigger to restart polling

  const handleRegenerate = async () => {
    if (!planId) return;

    try {
      // Reset states
      setLoading(true);
      setError(null);
      setStatus("generating");
      setPlanData(null);

      // Trigger regeneration
      await triggerPlanGeneration(planId);

      // Increment pollTrigger to restart the useEffect polling
      setPollTrigger((prev) => prev + 1);

      console.log("🔄 Regeneration triggered, polling restarted");
    } catch (err) {
      console.error("Error regenerating plan:", err);
      setError("Failed to regenerate plan");
      setLoading(false);
    }
  };

  const handleTaskToggle = async (stepIndex: number, taskIndex: number, currentCompleted: boolean) => {
    if (!planId) return;

    try {
      const newCompleted = !currentCompleted;

      // Optimistically update local state
      setPlanData((prevData: any) => {
        if (!prevData) return prevData;

        const updatedSteps = [...prevData.steps];
        if (updatedSteps[stepIndex] && updatedSteps[stepIndex].tasks[taskIndex]) {
          updatedSteps[stepIndex].tasks[taskIndex].completed = newCompleted;
        }

        return { ...prevData, steps: updatedSteps };
      });

      // Update in backend
      await updateTaskCompletion(planId, stepIndex, taskIndex, newCompleted);
    } catch (err) {
      console.error("Error updating task completion:", err);

      // Revert on error
      setPlanData((prevData: any) => {
        if (!prevData) return prevData;

        const updatedSteps = [...prevData.steps];
        if (updatedSteps[stepIndex] && updatedSteps[stepIndex].tasks[taskIndex]) {
          updatedSteps[stepIndex].tasks[taskIndex].completed = currentCompleted;
        }

        return { ...prevData, steps: updatedSteps };
      });
    }
  };

  const handleCopy = () => {
    if (!planData?.steps) return;

    const planText = formatPlanAsText(planData);
    navigator.clipboard.writeText(planText);
  };

  const formatPlanAsText = (plan: any) => {
    let text = `Interview Preparation Plan\n`;
    text += `Role: ${plan.jobTitle}\n`;
    text += `Company: ${plan.company || "N/A"}\n`;
    text += `Interview Date: ${plan.interviewDate || "TBD"}\n\n`;

    plan.steps.forEach((step: any, index: number) => {
      text += `\n${index + 1}. ${step.title}\n`;
      text += `   ${step.description}\n`;
      text += `   Timeframe: ${step.timeframe}\n\n`;
      step.tasks?.forEach((task: any, taskIndex: number) => {
        text += `   ${taskIndex + 1}) ${task.task}\n`;
        text += `      Time: ${task.estimatedTime} | Priority: ${task.priority}\n`;
        if (task.resources) {
          text += `      Resources: ${task.resources}\n`;
        }
        text += `\n`;
      });
    });

    return text;
  };

  if (error) {
    return (
      <PrepPlanLayout title="Preparation Plan">
        <CardContent className="space-y-4 py-8">
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
              {planId && (
                <Button onClick={handleRegenerate}>
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </PrepPlanLayout>
    );
  }

  if (loading || status === "generating" || status === "pending") {
    return (
      <PrepPlanLayout title="Generating Your Plan">
        <CardContent className="space-y-6 py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h2 className="text-xl font-semibold">Creating Your Personalized Plan</h2>
            <p className="text-muted-foreground">
              AI is analyzing your information and generating a customized preparation plan...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>This usually takes 10-20 seconds</span>
            </div>
          </div>
        </CardContent>
      </PrepPlanLayout>
    );
  }

  if (!planData || !planData.steps || planData.steps.length === 0) {
    return (
      <PrepPlanLayout title="Preparation Plan">
        <CardContent className="space-y-4 py-8">
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">No Plan Generated</h2>
            <p className="text-muted-foreground">
              We couldn't generate a plan with the provided information.
            </p>
            <Button onClick={handleRegenerate}>
              Try Generating Again
            </Button>
          </div>
        </CardContent>
      </PrepPlanLayout>
    );
  }

  return (
    <PrepPlanLayout title="Your Personalized Prep Plan">
      <CardContent className="space-y-6">
        {/* Success Header */}
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">Plan Generated Successfully!</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your personalized preparation plan is ready
            </p>
          </div>
        </div>

        {/* Plan Overview */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{planData.jobTitle}</h2>
          {planData.company && (
            <p className="text-lg text-muted-foreground">at {planData.company}</p>
          )}
          {planData.interviewDate && (
            <p className="text-sm text-muted-foreground">
              Interview Date: {new Date(planData.interviewDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Generated Steps */}
        <div className="space-y-6 mt-8">
          <h3 className="text-xl font-semibold">Preparation Steps</h3>

          {planData.steps.map((step: any, index: number) => (
            <div key={index} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-lg font-semibold">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <p className="text-sm font-medium text-primary">
                    ⏰ {step.timeframe}
                  </p>
                </div>
              </div>

              {/* Tasks */}
              {step.tasks && step.tasks.length > 0 && (
                <div className="ml-11 space-y-3 mt-4">
                  {step.tasks.map((task: any, taskIndex: number) => {
                    const isCompleted = task.completed || false;
                    return (
                      <div
                        key={taskIndex}
                        className={`p-4 bg-muted/50 rounded-md space-y-2 transition-opacity duration-200 ${
                          isCompleted ? "opacity-50" : "opacity-100"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`task-${index}-${taskIndex}`}
                            checked={isCompleted}
                            onCheckedChange={() => handleTaskToggle(index, taskIndex, isCompleted)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <label
                                htmlFor={`task-${index}-${taskIndex}`}
                                className={`font-medium cursor-pointer ${
                                  isCompleted ? "line-through" : ""
                                }`}
                              >
                                {task.task}
                              </label>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                task.priority === "High" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                                task.priority === "Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
                                "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>⏱️ {task.estimatedTime}</span>
                            </div>
                            {task.resources && (
                              <p className="text-sm text-muted-foreground mt-2">
                                💡 {task.resources}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCopy}>
              Copy Plan
            </Button>
            <Button onClick={handleRegenerate}>
              Regenerate
            </Button>
          </div>
        </div>
      </CardContent>
    </PrepPlanLayout>
  );
}

// Main component with Suspense boundary
export default function ResultPage() {
  return (
    <Suspense fallback={
      <PrepPlanLayout title="Loading...">
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          </div>
        </CardContent>
      </PrepPlanLayout>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
