"use client"; // Indicates that this is a Client Component in Next.js

import React from "react"; 
import { CardHeader, CardTitle } from "@/components/ui/card"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Textarea } from "@/components/ui/textarea"; 
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 
import { ArrowRight, ArrowLeft, Check, Building, Briefcase, MapPin } from "lucide-react"; 
import { toast } from "sonner"; 
import { useWorkflow } from "@/context/WorkflowContext"; 
import { createJobDescription } from "@/lib/api"; 

const JobDetailsStage = () => {
  // Destructure values and functions from the Workflow context
  const { 
    jobDetailsData, 
    updateJobDetailsData, // Function to update job details
    completeCurrentStage, // Function to mark the current stage as complete
    goToNextStage, // Function to navigate to the next stage
    goToPreviousStage // Function to navigate to the previous stage
  } = useWorkflow();
  const router = useRouter(); // Initialize the router

  // Handle input changes for text fields
  const handleInputChange = (field: keyof typeof jobDetailsData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateJobDetailsData({ [field]: e.target.value }); 
  };

  // Handle select changes for dropdown fields
  const handleSelectChange = (field: keyof typeof jobDetailsData) => (value: string) => {
    updateJobDetailsData({ [field]: value }); 
  };

  // Confirm job details and proceed to the next stage
  const confirmJobDetails = async () => {
    // Validate required fields
    if (!jobDetailsData.jobTitle || !jobDetailsData.companyName || !jobDetailsData.description) {
      toast.error("Please enter job title, company name, and description"); // Show error toast
      return;
    }

    try {
      // Call API to create job description
      await createJobDescription(
        jobDetailsData.jobTitle,
        jobDetailsData.companyName,
        jobDetailsData.location,
        jobDetailsData.jobType,
        jobDetailsData.description
      );
      toast.success("Job details confirmed!"); // Show success toast
      completeCurrentStage(); // Mark the current stage as complete
      
      // Scroll to the next section smoothly
      const nextSection = document.getElementById("stage-resume-preview");
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: "smooth" });
      }
      
      // Navigate to the next stage after a short delay
      setTimeout(() => {
        goToNextStage();
      }, 300);
    } catch (error) {
      toast.error("Failed to confirm job details. Please try again."); // Show error toast
    }
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
          Enter Job Details
        </CardTitle>
      </CardHeader>
      
      {/* Form for job details */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Job Title input field */}
          <div className="space-y-2">
            <Label htmlFor="job-title" className="text-base">
              <Briefcase className="inline-block mr-2 h-4 w-4" />
              Job Title *
            </Label>
            <Input
              id="job-title"
              placeholder="e.g. Frontend Developer"
              value={jobDetailsData.jobTitle}
              onChange={handleInputChange("jobTitle")}
              className="w-full"
            />
          </div>
          
          {/* Company Name input field */}
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-base">
              <Building className="inline-block mr-2 h-4 w-4" />
              Company Name *
            </Label>
            <Input
              id="company-name"
              placeholder="e.g. Acme Inc."
              value={jobDetailsData.companyName}
              onChange={handleInputChange("companyName")}
              className="w-full"
            />
          </div>

          {/* Location input field */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-base">
              <MapPin className="inline-block mr-2 h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g. San Francisco, CA or Remote"
              value={jobDetailsData.location}
              onChange={handleInputChange("location")}
              className="w-full"
            />
          </div>

          {/* Job Type dropdown field */}
          <div className="space-y-2">
            <Label htmlFor="job-type" className="text-base">
              Job Type
            </Label>
            <Select
              value={jobDetailsData.jobType}
              onValueChange={handleSelectChange("jobType")}>
              
              <SelectTrigger
                id="job-type"
                className="bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-300 shadow-md rounded-md">
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Job Description textarea field */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description" className="text-lg font-medium">
              Job Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Paste the full job description here..."
              value={jobDetailsData.description}
              onChange={handleInputChange("description")}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Tip: Copy and paste the full job description from the job posting.
              This will help us analyze the requirements and provide better
              interview preparation.
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {/* Back button */}
          <Button 
            variant="outline" 
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resume
          </Button>
          {/* Confirm and Continue button */}
          <Button 
            onClick={confirmJobDetails}
            disabled={
              !jobDetailsData.jobTitle ||
              !jobDetailsData.companyName ||
              !jobDetailsData.description
            }>
            <Check className="mr-2 h-4 w-4" />
            Confirm & Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsStage; 