"use client";
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "@/context/WorkflowContext";

const ResumePreviewStage = () => {
  const { 
    resumeData, 
    updateResumeData, 
    completeCurrentStage, 
    goToNextStage, 
    goToPreviousStage 
  } = useWorkflow();

  const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateResumeData({ text: e.target.value });
  };

  const confirmResume = () => {
    completeCurrentStage();
    toast.success("Resume confirmed! Ready for the next step.");
    // In a real app, we would save the data to a backend here
    // For now we just mark this stage as complete
    // If there was a next stage, we'd call goToNextStage() here
  };

  const goBack = () => {
    // Scroll to the previous section smoothly
    const prevSection = document.getElementById("stage-resume-upload");
    if (prevSection) {
      prevSection.scrollIntoView({ behavior: "smooth" });
    }
    
    // Then update the active stage
    setTimeout(() => {
      goToPreviousStage();
    }, 300);
  };

  return (
    <div className="transition-all duration-500 ease-in-out">
      <CardHeader className="px-0">
        <CardTitle className="text-center text-2xl">
          Review & Confirm Your Resume
        </CardTitle>
      </CardHeader>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="resume-text" className="text-lg font-medium">
            Resume Preview
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            We've extracted the text from your resume. You can edit it if needed.
          </p>
          <Textarea
            id="resume-text"
            value={resumeData.text}
            onChange={handleTextUpdate}
            className="min-h-[300px] font-mono text-sm"
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={confirmResume}>
            <Check className="mr-2 h-4 w-4" />
            Confirm Resume
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumePreviewStage;
