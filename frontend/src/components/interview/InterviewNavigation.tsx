import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Loader2 } from "lucide-react";

interface InterviewNavigationProps {
  isLastQuestion: boolean;
  activeCall: boolean;
  hasCurrentQuestionBeenAnswered: boolean;
  isUploading: boolean;
  isRecording: boolean;
  onNext: () => Promise<void>;
}

export const InterviewNavigation = ({
  isLastQuestion,
  activeCall,
  hasCurrentQuestionBeenAnswered,
  isUploading,
  isRecording,
  onNext,
}: InterviewNavigationProps) => {
  return (
    <div className="flex justify-end mb-10">
      <Button
        onClick={onNext}
        className="flex items-center gap-2"
        disabled={
          !activeCall ||
          !hasCurrentQuestionBeenAnswered ||
          isRecording ||
          isUploading
        }>
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : isLastQuestion ? (
          "Finish Interview"
        ) : (
          "Next Question"
        )}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
