"use client";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";
import { useRouter } from "next/navigation";

const AdditionalNotesStage = () => {
  const { data, updateData, prevStage } = usePrepPlan();
  const [otherNotes, setOtherNotes] = useState(data.otherNotes || "");
  const router = useRouter();

  useEffect(() => {
    updateData({ otherNotes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ otherNotes]);

  const handleGenerate = () => {
    // mark completed if you want (context handles stage completion)
    router.push('/Plan/result');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Other notes</Label>
        <Textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} placeholder="e.g. Only evenings available, special accommodations" />
      </div>

      <div className="flex gap-3 pt-3">
        <Button onClick={prevStage}>Back</Button>
        <Button onClick={handleGenerate}>Generate Plan</Button>
      </div>
    </div>
  );
};

export default AdditionalNotesStage;
