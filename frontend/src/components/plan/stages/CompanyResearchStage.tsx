"use client";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";

const CompanyResearchStage = ({isActive}:{isActive:boolean}) => {
  const { data, updateData, nextStage, prevStage } = usePrepPlan();
  const [notes, setNotes] = useState(data.researchNotes || "");
  const [error, setError] = useState("");

  useEffect(() => {
    updateData({ researchNotes: notes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const handleNext = () => {
    if (!notes.trim()) {
      setError("Job description is required.");
      return;
    }
    setError("");
    nextStage();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Job Description *</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Describe the role, responsibilities, required skills/years of experience... "
          disabled={!isActive}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div className="flex gap-3 pt-3">
        <Button onClick={prevStage} disabled={!isActive}>Back</Button>
        <Button onClick={handleNext} disabled={!isActive}>Next</Button>
      </div>
    </div>
  );
};

export default CompanyResearchStage;
