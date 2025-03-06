"use client";
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useWorkflow } from "@/context/WorkflowContext";

const ResumeUploadStage = () => {
  const { 
    resumeData,
    updateResumeData,
    goToNextStage,
    completeCurrentStage 
  } = useWorkflow();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      
      if (allowedTypes.includes(file.type)) {
        updateResumeData({ file });
        // Simulate text extraction
        setTimeout(() => {
          // This would be replaced by actual text extraction in a real app
          const sampleText = `JOHN DOE\n\nProfessional Summary\nExperienced software developer with 5 years of experience in web development...\n\nSkills\n- JavaScript/TypeScript\n- React.js\n- Node.js\n- SQL and NoSQL databases\n\nWork Experience\nSenior Developer at TechCorp (2020-Present)\n- Developed responsive web applications using React\n- Led a team of 3 junior developers\n\nEducation\nBS in Computer Science, University of Technology (2018)`;
          updateResumeData({ text: sampleText });
        }, 1000);
        toast.success("Resume uploaded successfully");
      } else {
        toast.error("Please upload a .pdf or .docx file");
      }
    }
  };

  const handleUseExisting = () => {
    updateResumeData({ hasExisting: true });
    // Simulate loading existing resume
    setTimeout(() => {
      const existingResumeText = `JANE SMITH\n\nProfessional Summary\nCreative full-stack developer with 3 years of experience...\n\nSkills\n- React/Redux\n- Express.js\n- MongoDB\n- AWS\n\nWork Experience\nDeveloper at WebSolutions (2019-Present)\n- Built and maintained client websites\n- Optimized database performance\n\nEducation\nMS in Software Engineering, Tech University (2019)`;
      updateResumeData({ text: existingResumeText });
      toast.success("Previous resume loaded");
    }, 800);
  };

  const nextStep = () => {
    completeCurrentStage();
    
    // Scroll to the next section smoothly
    const nextSection = document.getElementById("stage-resume-preview");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }
    
    // Then update the active stage
    setTimeout(() => {
      goToNextStage();
    }, 300);
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
            <div className="relative">
              <input
                type="file"
                id="resume-upload"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                accept=".pdf,.docx"
                onChange={handleFileChange}
              />
              <Button variant="outline" className="relative">
                <Upload className="mr-2 h-4 w-4" />
                Select File
              </Button>
            </div>
            {resumeData.file && (
              <p className="mt-4 text-sm">
                Selected: <span className="font-medium">{resumeData.file.name}</span>
              </p>
            )}
          </div>

          {/* Use existing resume */}
          <div 
            className={`border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${resumeData.hasExisting ? 'border-primary bg-primary/5' : 'hover:border-primary'}`}
            onClick={handleUseExisting}
          >
            <FileText className="w-12 h-12 mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Use Existing Resume</h3>
            <p className="text-sm text-gray-500 mb-4">
              We'll use your previously uploaded resume
            </p>
            <Button 
              variant={resumeData.hasExisting ? "default" : "outline"}
              onClick={handleUseExisting}
            >
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
            disabled={!resumeData.file && !resumeData.hasExisting}
          >
            Next Step
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadStage;
