import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Recording } from "./types";

interface AnswerSectionProps {
  recording: Recording | null;
  isRecording: boolean;
}

export const AnswerSection = ({
  recording,
  isRecording,
}: AnswerSectionProps) => {
  return (
    <div className="flex items-start mt-6">
      <div className="flex-grow">
        {recording?.url ? (
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-100">
            <h3 className="text-secondary-foreground font-medium mb-3">
              Your Answer:
            </h3>
            <audio src={recording.url || ""} controls className="w-full" />
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-green-100 flex items-center justify-center h-20">
            <p className="text-muted-foreground text-center">
              {isRecording
                ? "Recording your answer..."
                : "Click 'Record Answer' below to respond"}
            </p>
          </div>
        )}
      </div>
      <Avatar className="h-12 w-12 border-2 border-accent ml-4">
        <AvatarImage src="" alt="You" />
        <AvatarFallback className="bg-accent/10 text-accent">
          <User className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
