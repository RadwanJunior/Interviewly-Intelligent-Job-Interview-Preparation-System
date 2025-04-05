"use client"; // Indicates that this is a Client Component in Next.js

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
  // Destructure values and functions from the Workflow context
  const {
    resumeData, 
    updateResumeData, // Function to update resume data
    completeCurrentStage, // Function to mark the current stage as complete
    goToNextStage, // Function to navigate to the next stage
    goToPreviousStage, // Function to navigate to the previous stage
  } = useWorkflow();

  const [isSaving, setIsSaving] = useState(false); // State to manage saving status

  // Fetch the extracted resume text if not already loaded
  useEffect(() => {
    const fetchResume = async () => {
      if (!resumeData.text) {
        try {
          const response = await getResume(); // Call API to fetch resume text
          if (response && response.extracted_text) {
            updateResumeData({ text: response.extracted_text }); // Update resume text in context
          } else {
            toast.error("Failed to load resume text."); // Show error toast
          }
        } catch (error: any) {
          console.error("Error fetching resume:", error); // Log error
          toast.error("Error fetching resume text."); // Show error toast
        }
      }
    };

    fetchResume(); // Invoke the fetch function
  }, [resumeData.text, updateResumeData]); // Run effect when resumeData.text or updateResumeData changes

  // Handle changes to the resume text
  const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateResumeData({ text: e.target.value }); // Update resume text in context
  };

  // Confirm and save the resume text
  const confirmResume = async () => {
    setIsSaving(true); // Set saving state to true
    try {
      await updateResume(resumeData.text || ""); // Call API to update resume text
      toast.success("Resume updated successfully!"); // Show success toast
    } catch (error: any) {
      console.error("Error updating resume:", error); // Log error
      toast.error("Failed to update resume."); // Show error toast
    } finally {
      setIsSaving(false); // Reset saving state
    }

    completeCurrentStage(); // Mark the current stage as complete

    // Scroll to the next section smoothly
    const nextSection = document.getElementById("stage-job-details");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }

    // Navigate to the next stage after a short delay
    setTimeout(() => {
      goToNextStage();
    }, 300);
  };

  // Navigate back to the previous stage
  const goBack = () => {
    // Scroll to the previous section smoothly
    const prevSection = document.getElementById("stage-resume-upload");
    if (prevSection) {
      prevSection.scrollIntoView({ behavior: "smooth" });
    }
    // Navigate to the previous stage after a short delay
    setTimeout(() => {
      goToPreviousStage();
    }, 300);
  };

  return (
    <div className="transition-all duration-500 ease-in-out">
      {/* Card header with title */}
      <CardHeader className="px-0">
        <CardTitle className="text-center text-2xl">
          Review & Confirm Your Resume
        </CardTitle>
      </CardHeader>

      {/* Main content */}
      <div className="space-y-6">
        {/* Display the uploaded file name */}
        {resumeData.fileName && (
          <p className="text-sm text-gray-500">File: {resumeData.fileName}</p>
        )}

        {/* Resume text area */}
        <div>
          <Label htmlFor="resume-text" className="text-lg font-medium">
            Resume Preview
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            We&apos;ve extracted the text from your resume. Edit if needed.
          </p>
          <Textarea
            id="resume-text"
            value={resumeData.text || ""} // Display the resume text
            onChange={handleTextUpdate} // Handle text changes
            className="min-h-[300px] font-mono text-sm" // Styling for the textarea
            disabled={isSaving} // Disable textarea while saving
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {/* Back button */}
          <Button variant="outline" onClick={goBack} disabled={isSaving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {/* Confirm & Continue button */}
          <Button onClick={confirmResume} disabled={isSaving}>
            {isSaving ? (
              // Show loading spinner while saving
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              // Show confirmation text when not saving
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