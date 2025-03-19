"use client";
import React, { useState } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "@/context/WorkflowContext";
import { uploadResume, getResumeFromUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ResumeUploadStage = () => {
  const { user } = useAuth();
  const { resumeData, updateResumeData, goToNextStage, completeCurrentStage } =
    useWorkflow();
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (allowedTypes.includes(file.type)) {
        // Update context with the file; clear any previous text
        updateResumeData({ file, text: "", hasExisting: false });
        toast.success("File selected successfully");
      } else {
        toast.error("Please upload a .pdf or .docx file");
      }
    }
  };

  // For "Use Existing" action
  const handleUseExisting = async () => {
    if (!user?.id) {
      toast.error("User not logged in");
      return;
    }
    setLoading(true);
    try {
      // Pass the user's id so the backend can verify the session
      const response = await getResumeFromUser(user.id);
      if (response && response.length > 0) {
        updateResumeData({
          text: response[0].extracted_text,
          hasExisting: true,
          file: null,
        });
        toast.success("Existing resume loaded");
      } else {
        toast.error("No existing resume. Please upload one.");
      }
    } catch (error: any) {
      toast.error("Error fetching resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (!user?.id) {
      toast.error("User not logged in");
      return;
    }
    setLoading(true);
    try {
      // If using a new file, call the upload endpoint
      if (resumeData.file && !resumeData.hasExisting) {
        const response = await uploadResume(resumeData.file);
        console.log("Upload Resume Response:", response);
        if (response.error) {
          toast.error(response.error);
          return;
        }
        // Update context with the parsed text from the backend
        updateResumeData({ text: response.data[0].extracted_text });
        toast.success("Resume processed successfully");
      }
      // If using existing resume but no text exists, prompt user to choose
      else if (resumeData.hasExisting && !resumeData.text) {
        toast.error("No stored resume found. Please upload your resume first.");
        return;
      }

      completeCurrentStage();
      goToNextStage();
    } catch (error: any) {
      toast.error("There was an error processing your resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transition-all duration-500 ease-in-out">
      <CardHeader className="px-0">
        <CardTitle className="text-center text-2xl">
          Upload Your Resume
        </CardTitle>
      </CardHeader>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Upload new resume */}
          <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary transition-colors">
            <Upload className="w-12 h-12 mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Upload New Resume</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your resume in .docx or .pdf format
            </p>
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
            {resumeData.file && (
              <p className="mt-4 text-sm">
                Selected:{" "}
                <span className="font-medium">{resumeData.file.name}</span>
              </p>
            )}
          </div>

          {/* Use existing resume */}
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

        {/* Navigation buttons */}
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
