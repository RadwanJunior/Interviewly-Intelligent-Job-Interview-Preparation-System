"use client";
import React from "react";
import PrepPlanLayout from "@/components/plan/PrepPlanLayout";
import PrepPlanStageRenderer from "@/components/plan/PrepPlanStageRenderer";
import { PrepPlanProvider } from "@/context/plan/PrepPlanContext";

const CreatePrepPlanPage = () => {
  return (
    <PrepPlanProvider>
      <PrepPlanLayout title="Create Your Interview Prep Plan">
        <PrepPlanStageRenderer />
      </PrepPlanLayout>
    </PrepPlanProvider>
  );
};

export default CreatePrepPlanPage;