import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingProps {
  message?: string;
}

interface ErrorProps {
  message: string;
}

export const LoadingState = ({
  message = "Loading your interview questions...",
}: LoadingProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center animate-fade-up">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg font-heading">{message}</p>
      </div>
    </div>
  );
};

export const ErrorState = ({ message }: ErrorProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md animate-fade-up border-destructive/50">
        <CardContent className="pt-6">
          <h3 className="text-destructive font-medium text-lg mb-2">Error</h3>
          <p className="text-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};
