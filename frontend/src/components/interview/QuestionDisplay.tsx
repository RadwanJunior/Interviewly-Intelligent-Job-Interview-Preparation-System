import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MessageSquare, Clock } from "lucide-react";

interface QuestionDisplayProps {
  question: string;
  showingCountdown: boolean;
  autoRecordCountdown: number;
}

export const QuestionDisplay = ({
  question,
  showingCountdown,
  autoRecordCountdown,
}: QuestionDisplayProps) => {
  return (
    <div className="flex items-start mb-6">
      <Avatar className="h-12 w-12 border-2 border-primary">
        <AvatarImage src="" alt="Interviewer" />
        <AvatarFallback className="bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
      <div className="ml-4 flex-1">
        <div className="font-medium text-foreground">Interviewer</div>
        <div className="mt-3 bg-gray-100 p-4 rounded-lg rounded-tl-none border border-gray-100">
          <MessageSquare className="h-5 w-5 text-primary mb-2" />
          <p className="text-secondary-foreground text-lg">{question}</p>
          {showingCountdown && autoRecordCountdown > 0 && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-md p-3 flex items-center">
              <Clock className="h-5 w-5 text-gray-900 mr-2 flex-shrink-0" />
              <p className="text-gray-900 text-sm">
                Recording will start automatically in{" "}
                <span className="font-semibold">{autoRecordCountdown}</span>{" "}
                seconds
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
