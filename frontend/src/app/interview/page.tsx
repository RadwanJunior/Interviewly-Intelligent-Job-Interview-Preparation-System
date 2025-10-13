// src/app/interview/page.tsx
import { Suspense } from "react";
import InterviewInner from "./InterviewInner";
import { LoadingState } from "../../components/interview/LoadingStates";

export default function InterviewPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading interview..." />}>
      <InterviewInner />
    </Suspense>
  );
}
