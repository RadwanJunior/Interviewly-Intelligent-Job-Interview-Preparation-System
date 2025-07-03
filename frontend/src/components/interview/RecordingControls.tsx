import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, StopCircle } from "lucide-react";

interface RecordingControlsProps {
  isRecording: boolean;
  activeCall: boolean;
  hasRecording: boolean;
  recordingTime: number;
  timeRemaining: number;
  timeRemainingPercentage: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

// Helper function for formatting time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export const RecordingControls = ({
  isRecording,
  activeCall,
  hasRecording,
  recordingTime,
  timeRemaining,
  timeRemainingPercentage,
  onStartRecording,
  onStopRecording,
}: RecordingControlsProps) => {
  return (
    <div className="bg-muted p-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Time remaining: {formatTime(timeRemaining)}</span>
              <span>Max: 1:30</span>
            </div>
            <Progress
              value={timeRemainingPercentage}
              className="h-2 bg-secondary"
            />
          </div>
        )}

        {/* Recording Status Indicator */}
        <div className="flex items-center gap-2 text-foreground">
          {isRecording ? (
            <>
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse"></div>
              <span className="text-sm">
                Recording... {formatTime(recordingTime)}
              </span>
            </>
          ) : null}
        </div>

        {/* Recording Control Buttons */}
        <div className="flex items-center gap-3">
          {isRecording ? (
            <Button
              variant="destructive"
              onClick={onStopRecording}
              className="bg-red-600 hover:bg-red-700 text-white">
              <StopCircle className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={onStartRecording}
              disabled={!activeCall}>
              <Mic className="h-5 w-5 mr-2" />
              {hasRecording ? "Record Again" : "Record Answer"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
