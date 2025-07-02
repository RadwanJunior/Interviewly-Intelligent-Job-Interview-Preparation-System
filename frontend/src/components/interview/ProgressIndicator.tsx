import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  currentQuestion: number;
  totalQuestions: number;
  progress: number;
}

export const ProgressIndicator = ({
  currentQuestion,
  totalQuestions,
  progress,
}: ProgressIndicatorProps) => {
  return (
    <Card className="mb-6 shadow-sm">
      <CardContent className="pt-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {currentQuestion + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardContent>
    </Card>
  );
};
