import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

interface InterviewHeaderProps {
  activeCall: boolean;
  onEndCall: () => void;
}

export const InterviewHeader = ({
  activeCall,
  onEndCall,
}: InterviewHeaderProps) => {
  return (
    <div className="bg-primary p-3 flex justify-between items-center">
      <div className="flex items-center">
        <Video className="h-5 w-5 text-primary-foreground mr-2" />
        <span className="text-primary-foreground font-medium">
          Interview Session
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-primary-foreground/90 text-sm flex items-center">
          <div
            className={`h-2 w-2 rounded-full ${
              activeCall ? "bg-green-400" : "bg-red-400"
            } mr-1`}></div>
          {activeCall ? "Active" : "Call Ended"}
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={onEndCall}
          className="h-8 text-red-600">
          End Call
        </Button>
      </div>
    </div>
  );
};
