"use client"; // Indicates that this is a Client Component in Next.js

import React, { useState } from "react"; 
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; =
import { Upload, FileText, ArrowRight, Check } from "lucide-react"; 
import { toast } from "sonner"; 
import { useWorkflow } from "@/context/WorkflowContext"; 
import { uploadResume, getResume } from "@/lib/api"; // Import API functions for resume operations
import { useAuth } from "@/context/AuthContext"; 

const ResumeUploadStage = () => {
  const { user } = useAuth(); // Access user data from the Auth context
  const {
    resumeData, 
    updateResumeData, // Function to update resume data
    goToNextStage, // Function to navigate to the next stage
    completeCurrentStage, // Function to mark the current stage as complete
  } = useWorkflow();

  const [loading, setLoading] = useState(false); // State to manage loading status

  // Handle file selection for resume upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]; // Allowed file types: PDF and DOCX

      if (allowedTypes.includes(file.type)) {
        // Update context with the new file and clear previous data
        updateResumeData({
          file,
          text: "",
          hasExisting: false,
          fileName: undefined,
          resumeId: undefined,
        });
        toast.success("File selected successfully"); // Show success toast
      } else {
        toast.error("Please upload a .pdf or .docx file"); // Show error toast for invalid file types
      }
    }
  };

  // Handle "Use Existing Resume" action
  const handleUseExisting = async () => {
    setLoading(true); // Set loading state to true
    try {
      // Call API to fetch the user's existing resume
      const response = await getResume();
      console.log("Get Resume Response:", response);
      if (response && response.data && response.data.length > 0) {
        // Use the latest resume from the response
        const latestRes = response.data[0];
        updateResumeData({
          fileName: latestRes.file_url.split("/").pop(), // Extract filename from the URL
          text: latestRes.extracted_text,
          hasExisting: true,
          file: null,
          resumeId: latestRes.id,
        });
        toast.success("Existing resume loaded"); // Show success toast
      } else {
        toast.error("No existing resume found. Please upload one."); // Show error toast if no resume exists
      }
    } catch (error: any) {
      console.error("Error fetching resume:", error); // Log error
      toast.error("Error fetching resume. Please try again."); // Show error toast
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Handle the "Next Step" action
  const nextStep = async () => {
    if (!user) {
      toast.error("User not logged in"); // Show error toast if user is not logged in
      return;
    }
    setLoading(true); // Set loading state to true
    try {
      // If a new file is selected, upload it
      if (resumeData.file && !resumeData.hasExisting) {
        const response = await uploadResume(resumeData.file);
        console.log("Upload Resume Response:", response);
        if (response.error) {
          toast.error(response.error); // Show error toast if upload fails
          setLoading(false);
          return;
        }
        // Update context with the uploaded resume details
        const uploadedResume = response.data[0];
        updateResumeData({
          text: uploadedResume.extracted_text,
          fileName: resumeData.file.name,
          hasExisting: false,
          resumeId: uploadedResume.id,
        });
        toast.success("Resume processed successfully"); // Show success toast
      }
      // If using an existing resume, ensure it has valid data
      else if (
        resumeData.hasExisting &&
        resumeData.text &&
        resumeData.fileName
      ) {
        toast.success("Using existing resume"); // Show success toast
      } else {
        toast.error("No stored resume found. Please upload your resume first."); // Show error toast if no resume is available
        setLoading(false);
        return;
      }

      completeCurrentStage(); // Mark the current stage as complete
      goToNextStage(); // Navigate to the next stage
    } catch (error: any) {
      console.error("Error processing resume:", error); // Log error
      toast.error("There was an error processing your resume."); // Show error toast
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="transition-all duration-500 ease-in-out">
      {/* Card header with title */}
      <CardHeader className="px-0">
        <CardTitle className="text-center text-2xl">
          Upload Your Resume
        </CardTitle>
      </CardHeader>

      {/* Main content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Upload new resume section */}
          <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary transition-colors">
            <Upload className="w-12 h-12 mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Upload New Resume</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your resume in .docx or .pdf format
            </p>
            {/* File input for resume upload */}
            <div className="relative w-full max-w-[200px]">
              <input
                type="file"
                id="resume-upload"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                accept=".pdf,.docx"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                className="relative w-full hover:bg-accent hover:text-accent-foreground transition-all duration-200">
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </div>
            {/* Display selected file name */}
            {resumeData.file && (
              <p className="mt-4 text-sm">
                Selected:{" "}
                <span className="font-medium">{resumeData.file.name}</span>
              </p>
            )}
          </div>

          {/* Use existing resume section */}
          <div
            className={`border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              resumeData.hasExisting
                ? "border-primary bg-primary/5"
                : "hover:border-primary"
            }`}
            onClick={handleUseExisting}>
            <FileText className="w-12 h-12 mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Use Existing Resume</h3>
            <p className="text-sm text-gray-500 mb-4">
              We'll use your previously uploaded resume
            </p>
            {/* Display existing file name */}
            {resumeData.hasExisting && resumeData.fileName && (
              <p className="mt-2 text-sm text-gray-700">
                Existing File:{" "}
                <span className="font-medium">{resumeData.fileName}</span>
              </p>
            )}
            <Button
              variant={resumeData.hasExisting ? "default" : "outline"}
              onClick={handleUseExisting}
              className={
                resumeData.hasExisting
                  ? ""
                  : "hover:bg-accent hover:text-accent-foreground transition-all duration-200"
              }>
              {resumeData.hasExisting ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Selected
                </>
              ) : (
                "Use Existing"
              )}
            </Button>
          </div>
        </div>

        {/* Navigation button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={nextStep}
            disabled={loading || (!resumeData.file && !resumeData.hasExisting)}>
            Next Step
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadStage; 