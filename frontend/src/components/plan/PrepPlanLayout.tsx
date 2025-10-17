"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PrepPlanStepper from "./PrepPlanStepper";
import { usePrepPlan } from "@/context/plan/PrepPlanContext";

type Props = { children: React.ReactNode; title?: string };

const PrepPlanLayout = ({ children, title = "Interview Prep Plan" }: Props) => {
  const { stages, currentStageIndex } = usePrepPlan();
  const progress = ((currentStageIndex + 1) / stages.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-bold text-center mb-6 text-primary pt-16">{title}</h1>
      <Card className="mt-6 border border-border/50 rounded-xl shadow-md overflow-hidden">{children}</Card>
    </div>
  );
};

export default PrepPlanLayout;