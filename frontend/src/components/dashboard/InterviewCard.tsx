import { Calendar, Clock, Star, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Define the type for a single interview item right in the component
interface InterviewHistoryItem {
  id: string;
  jobTitle: string;
  company: string;
  date: string;
  duration: string;
  score: number;
  type: string;
}

interface InterviewCardProps {
  interview: InterviewHistoryItem;
  onViewFeedback: (interviewId: string) => void;
  getScoreColor: (score: number) => string;
  showTypeBadge?: boolean;
}

export const InterviewCard = ({
  interview,
  onViewFeedback,
  getScoreColor,
  showTypeBadge = false,
}: InterviewCardProps) => {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{interview.jobTitle}</h3>
          <p className="text-gray-600">{interview.company}</p>
        </div>
        <div className="flex items-center space-x-2">
          {showTypeBadge && (
            <Badge variant="outline" className="capitalize">
              {interview.type === "text" ? (
                <FileText className="h-3 w-3 mr-1" />
              ) : (
                <Phone className="h-3 w-3 mr-1" />
              )}
              {interview.type}
            </Badge>
          )}
          <Badge className={getScoreColor(interview.score)}>
            <Star className="h-3 w-3 mr-1" />
            {interview.score}%
          </Badge>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(interview.date).toLocaleDateString()}
          </span>
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {interview.duration || "N/A"}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewFeedback(interview.id)}>
          View Details
        </Button>
      </div>
    </div>
  );
};
