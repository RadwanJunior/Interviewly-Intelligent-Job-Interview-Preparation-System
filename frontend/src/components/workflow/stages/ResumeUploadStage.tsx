"use client";
import React, { useState } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "@/context/WorkflowContext";
import { uploadResume, getResume } from "@/lib/api";
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
        // Update context with the file; clear any previous text and resumeId
        updateResumeData({
          file,
          text: "",
          hasExisting: false,
          fileName: undefined,
          resumeId: undefined,
        });
        toast.success("File selected successfully");
      } else {
        toast.error("Please upload a .pdf or .docx file");
      }
    }
  };

  // For "Use Existing" action, fetch the resume using the session token in the backend.
  const handleUseExisting = async () => {
    setLoading(true);
    try {
      // Call your API GET /resumes endpoint; no need to pass a user id
      const response = await getResume();
      if (response && response.data && response.data.length > 0) {
        // Assuming response.data is an array with one resume record
        const latestRes = response.data[0];
        updateResumeData({
          fileName:
            latestRes.file_url.match(/[^/]+(\.pdf|\.docx)/)?.[0] ||
            "Unknown File", // Extract filename ending with .pdf or .docx
          text: latestRes.extracted_text,
          hasExisting: true,
          file: null,
          resumeId: latestRes.id,
        });
        toast.success("Existing resume loaded");
      } else {
        toast.error("No existing resume found. Please upload one.");
      }
    } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error fetching resume:", error.message);
        } else {
          console.error("Error fetching resume:", error);
        }
        toast.error("Error fetching resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // On nextStep, either upload the new file or use the existing resume details
  const nextStep = async () => {
    if (!user) {
      toast.error("User not logged in");
      return;
    }
    setLoading(true);
    try {
      // If a new file was selected, upload it
      if (resumeData.file && !resumeData.hasExisting) {
        const response = await uploadResume(resumeData.file);
        console.log("Upload Resume Response:", response);
        if (response.error) {
          toast.error(response.error);
          setLoading(false);
          return;
        }
        // Assuming API returns response.data as an array with one resume record
        const uploadedResume = response.data[0];
        updateResumeData({
          text: uploadedResume.extracted_text,
          fileName: resumeData.file.name,
          hasExisting: false,
          resumeId: uploadedResume.id,
        });
        toast.success("Resume processed successfully");
      }
      // If using an existing resume, ensure we have text and fileName already
      else if (
        resumeData.hasExisting &&
        resumeData.text &&
        resumeData.fileName
      ) {
        toast.success("Using existing resume");
      } else {
        toast.error("No stored resume found. Please upload your resume first.");
        setLoading(false);
        return;
      }

      completeCurrentStage();
      goToNextStage();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error processing resume:", error.message);
      } else {
        console.error("Error processing resume:", error);
      }
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
            {/* Show selected file name only for new uploads */}
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
              We&apos;ll use your previously uploaded resume
            </p>
            {/* Show existing file name only for existing resumes */}
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
