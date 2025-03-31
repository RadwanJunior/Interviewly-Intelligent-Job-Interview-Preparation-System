"use client";
import React, { useState, useEffect } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "@/context/WorkflowContext";
import { updateResume, getResume } from "@/lib/api";

const ResumePreviewStage = () => {
  const {
    resumeData,
    updateResumeData,
    completeCurrentStage,
    goToNextStage,
    goToPreviousStage,
  } = useWorkflow();

  const [isSaving, setIsSaving] = useState(false);

  // Fetch the extracted text if not already loaded
  useEffect(() => {
    const fetchResume = async () => {
      if (!resumeData.text) {
        try {
          const response = await getResume();
          if (response && response.extracted_text) {
            updateResumeData({ text: response.extracted_text });
          } else {
            toast.error("Failed to load resume text.");
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error("Error fetching resume:", error.message);
          } else {
            console.error("Error fetching resume:", error);
          }
          toast.error("Error fetching resume text.");
        }
      }
    };

    fetchResume();
  }, [resumeData.text, updateResumeData]);

  const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateResumeData({ text: e.target.value });
  };

  const confirmResume = async () => {
      try {
        setIsSaving(true);
        await updateResume(resumeData.text);
        toast.success("Resume updated successfully!");
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error updating resume:", error.message);
        } else {
          console.error("Error updating resume:", error);
        }
        toast.error("Failed to update resume.");
      } finally {
        setIsSaving(false);
      }
    
    completeCurrentStage();

    // Scroll to the next section smoothly
    const nextSection = document.getElementById("stage-job-details");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }

    // Then update the active stage
    setTimeout(() => {
      goToNextStage();
    }, 300);
  };

  const goBack = () => {
        const prevSection = document.getElementById("stage-resume-upload");
    if (prevSection) {
      prevSection.scrollIntoView({ behavior: "smooth" });
    }
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
        {resumeData.fileName && (
          <p className="text-sm text-gray-500">File: {resumeData.fileName}</p>
        )}

        <div>
          <Label htmlFor="resume-text" className="text-lg font-medium">
            Resume Preview
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            We&apos;ve extracted the text from your resume. Edit if needed.
          </p>
          <Textarea
            id="resume-text"
            value={resumeData.text || ""}
            onChange={handleTextUpdate}
            className="min-h-[300px] font-mono text-sm"
            disabled={isSaving}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={goBack} disabled={isSaving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={confirmResume} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm & Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumePreviewStage;
