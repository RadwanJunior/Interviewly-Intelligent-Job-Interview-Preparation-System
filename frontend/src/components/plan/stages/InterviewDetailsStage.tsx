"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";

const InterviewDetailsStage = () => {
  const { data, updateData, nextStage } = usePrepPlan();
  const [role, setRole] = useState(data.role || "");
  const [company, setCompany] = useState(data.company || "");
  const [date, setDate] = useState(data.date || "");
  const [focusAreas, setFocusAreas] = useState((data.focusAreas || []).join(", "));

  useEffect(() => {
    // persist on change
    updateData({ role, company, date, focusAreas: focusAreas.split(",").map(s => s.trim()).filter(Boolean) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, company, date, focusAreas]);

  return (
    <div className="space-y-4">
      <div>
        <Label>Role / Position</Label>
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" />
      </div>

      <div>
        <Label>Company (optional)</Label>
        <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google" />
      </div>

      <div>
        <Label>Interview Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <Label>Focus Areas (comma separated)</Label>
        <Input value={focusAreas} onChange={(e) => setFocusAreas(e.target.value)} placeholder="e.g. Algorithms, system design, behavior" />
      </div>

      <div className="flex gap-3 pt-3">
        <Button variant="ghost" onClick={() => { setRole(''); setCompany(''); setDate(''); setFocusAreas(''); }}>Clear</Button>
        <Button onClick={nextStage}>Next</Button>
      </div>
    </div>
  );
};

export default InterviewDetailsStage;