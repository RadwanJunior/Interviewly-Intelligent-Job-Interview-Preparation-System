"use client";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { triggerPlanGeneration } from "@/lib/api";

const AdditionalNotesStage = ({ isActive }: { isActive: boolean }) => {
  const { data, updateData, prevStage, savePlan, isSaving } = usePrepPlan();
  const [otherNotes, setOtherNotes] = useState(data.otherNotes || "");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    updateData({ otherNotes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherNotes]);

  const handleGenerate = async () => {
    try {
      console.log("🚀 Generating plan with data:", data);

      // Step 1: Save the plan data to Supabase
      const result = await savePlan();

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to save plan. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const planId = result.planId;

      if (!planId) {
        toast({
          title: "Error",
          description: "Failed to get plan ID. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Plan saved with ID:", planId);

      // Step 2: Trigger AI generation of the plan
      try {
        await triggerPlanGeneration(planId);
        console.log("🤖 Plan generation started");

        toast({
          title: "Generating Your Plan!",
          description: "AI is creating your personalized preparation plan...",
        });

        // Navigate to result page where it will poll for status
        router.push(`/Plan/result?planId=${planId}`);
      } catch (genError) {
        console.error("Error triggering plan generation:", genError);
        toast({
          title: "Warning",
          description: "Plan saved but generation failed. You can try again from the result page.",
          variant: "destructive",
        });
        // Still navigate to result page
        router.push(`/Plan/result?planId=${planId}`);
      }

    } catch (error) {
      console.error("Error in handleGenerate:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Other notes (Optional)</Label>
        <Textarea
          value={otherNotes}
          onChange={(e) => setOtherNotes(e.target.value)}
          placeholder="e.g. Only evenings available, special accommodations"
          disabled={!isActive}
        />
      </div>

      <div className="flex gap-3 pt-3">
        <Button onClick={prevStage} disabled={!isActive || isSaving}>
          Back
        </Button>
        <Button onClick={handleGenerate} disabled={!isActive || isSaving}>
          {isSaving ? "Saving..." : "Generate Plan"}
        </Button>
      </div>
    </div>
  );
};

export default AdditionalNotesStage;
