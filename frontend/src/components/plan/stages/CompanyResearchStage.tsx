"use client";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";


const CompanyResearchStage = () => {
const { data, updateData, nextStage, prevStage } = usePrepPlan();
const [notes, setNotes] = useState(data.researchNotes || "");


useEffect(() => {
updateData({ researchNotes: notes });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [notes]);


return (
<div className="space-y-4">
<div>
<Label>Job Description</Label>
<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Describe the role, responsibilities, required skills/years of experience... " />
</div>


<div className="flex gap-3 pt-3">
<Button onClick={prevStage}>Back</Button>
<Button onClick={nextStage}>Next</Button>
</div>
</div>
);
};


export default CompanyResearchStage;