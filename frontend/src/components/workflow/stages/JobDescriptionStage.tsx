"use client"
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "@/context/WorkflowContext";
import axios from "axios";

const JobDescriptionStage = () => {
  const { 
    jobDescriptionData, 
    updateJobDescriptionData, 
    completeCurrentStage, 
    goToPreviousStage 
  } = useWorkflow();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      
      if (allowedTypes.includes(file.type)) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await axios.post("/api/job-description/upload", formData, {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          });
          const { filename, parsed_text } = response.data;
          updateJobDescriptionData({ 
            file, 
            text: parsed_text,
            filename
          });
          toast.success("Job description uploaded successfully");
        } catch (error) {
          toast.error("Failed to parse the job description");
        }
      } else {
        toast.error("Please upload a .pdf, .docx, or .txt file");
      }
    }
  };

  const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateJobDescriptionData({ text: e.target.value });
  };

  const confirmJobDescription = () => {
    if (!jobDescriptionData.text.trim()) {
      toast.error("Please enter a job description");
      return;
    }
    
    completeCurrentStage();
    toast.success("Job description confirmed!");
    // In a real app, we would save the data to a backend here and perhaps redirect to a results page
    toast.success("All information gathered successfully! Ready for next steps.");
  };

  const goBack = () => {
    // Scroll to the previous section smoothly
    const prevSection = document.getElementById("stage-job-details");
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
          Add Job Description
        </CardTitle>
      </CardHeader>
      
      <div className="space-y-6">
        <div className="mb-6">
          <Label htmlFor="job-description-upload" className="text-lg font-medium">
            Upload Job Description
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            Upload a job description file or paste the job description text below
          </p>
          
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm text-center text-muted-foreground mb-2">
              Drag & drop your file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Supports PDF, DOCX, and TXT files
            </p>
            <div className="relative">
              <input
                type="file"
                id="job-description-upload"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
              <Button 
                variant="outline" 
                size="sm"
                className="hover:bg-accent hover:text-accent-foreground transition-all duration-200"
              >
                Browse Files
              </Button>
            </div>
            {jobDescriptionData.file && (
              <p className="mt-4 text-sm">
                Selected: <span className="font-medium">{jobDescriptionData.file.name}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="job-desc-text" className="text-lg font-medium">
            Job Description
          </Label>
          <p className="text-sm text-gray-500 mb-4">
            Enter or edit the job description text
          </p>
          <Textarea
            id="job-desc-text"
            value={jobDescriptionData.text}
            onChange={handleTextUpdate}
            placeholder="Paste job description here..."
            className="min-h-[250px] font-mono text-sm"
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Details
          </Button>
          <Button 
            onClick={confirmJobDescription}
            disabled={!jobDescriptionData.text.trim()}
          >
            <Check className="mr-2 h-4 w-4" />
            Confirm Job Description
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionStage;
