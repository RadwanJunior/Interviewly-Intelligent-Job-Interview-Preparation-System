"use client"
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const JobDetailsStage = () => {
  const { 
    jobDetailsData, 
    updateJobDetailsData, 
    completeCurrentStage, 
    goToNextStage, 
    goToPreviousStage 
  } = useWorkflow();

  const handleInputChange = (field: keyof typeof jobDetailsData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateJobDetailsData({ [field]: e.target.value });
  };

  const handleSelectChange = (field: keyof typeof jobDetailsData) => (value: string) => {
    updateJobDetailsData({ [field]: value });
  };

  const confirmJobDetails = () => {
    if (!jobDetailsData.jobTitle || !jobDetailsData.companyName) {
      toast.error("Please enter at least the job title and company name");
      return;
    }
    
    completeCurrentStage();
    toast.success("Job details confirmed!");
    
    // Scroll to the next section smoothly
    const nextSection = document.getElementById("stage-job-description");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }
    
    // Then update the active stage
    setTimeout(() => {
      goToNextStage();
    }, 300);
  };

  const goBack = () => {
    // Scroll to the previous section smoothly
    const prevSection = document.getElementById("stage-resume-preview");
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
          Enter Job Details
        </CardTitle>
      </CardHeader>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

          <div className="space-y-2">
            <Label htmlFor="job-type" className="text-base">
              Job Type
            </Label>
            <Select 
              value={jobDetailsData.jobType}
              onValueChange={handleSelectChange("jobType")}
            >
              <SelectTrigger id="job-type">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="salary" className="text-base">
              Expected Salary Range
            </Label>
            <Input
              id="salary"
              placeholder="e.g. $80,000 - $100,000"
              value={jobDetailsData.salary}
              onChange={handleInputChange("salary")}
              className="w-full"
            />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resume
          </Button>
          <Button 
            onClick={confirmJobDetails}
            disabled={!jobDetailsData.jobTitle || !jobDetailsData.companyName}
          >
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
