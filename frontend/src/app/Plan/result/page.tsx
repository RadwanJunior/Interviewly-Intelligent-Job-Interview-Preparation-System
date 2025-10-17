"use client";
import React, { useEffect, useState } from "react";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";
import PrepPlanLayout from "@/components/plan/PrepPlanLayout";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ResultPage = () => {
  const { data } = usePrepPlan();
  const router = useRouter();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Placeholder "generate" — replace with a real API call to your AI backend
  const generatePlan = async () => {
    setLoading(true);
    // Simulate AI call delay
    await new Promise((r) => setTimeout(r, 900));

    const generated = `Prep Plan for ${data.role || "[role]"} at ${data.company || "[company]"}\n\n` +
      `Interview Date: ${data.date || "TBD"}\n\n` +
      `1) Review role-specific concepts: ${data.focusAreas?.join(", ") || "general"}\n` +
      `2) Mock interview schedule: 3 rounds over 2 weeks\n` +
      `3) Company research topics: ${data.researchNotes || "N/A"}\n\n` +
      `Notes from resume: ${data.resumeNotes || "(no resume provided)"}`;

    setPlan(generated);
    setLoading(false);
  };

  useEffect(() => {
    // Auto-generate on mount (optional)
    if (!plan) generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PrepPlanLayout title="Your Generated Prep Plan">
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Preview</h2>
          {loading && <p className="text-sm text-muted-foreground">Generating plan…</p>}
          {plan && (
            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">{plan}</pre>
          )}
        </div>

        <div className="flex gap-3 items-center justify-between">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          <div className="flex gap-3">
            <Button onClick={generatePlan} disabled={loading}>
              Regenerate
            </Button>
            <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(plan || ""); }}>
              Copy Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </PrepPlanLayout>
  );
};

export default ResultPage;