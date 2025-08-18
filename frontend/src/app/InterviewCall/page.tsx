"use client";

import React, { useState, useRef, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Mic, User, PhoneOff } from "lucide-react";
import { lipsyncManager, resumeLipsyncAudio } from "@/lib/lipsync";
import dynamic from "next/dynamic";
import { useVAD } from "@/lib/useVAD";
import { UserVideo } from "@/components/InterviewCall/UserVideo";
import { triggerLiveFeedbackGeneration } from "@/lib/api";

const ClientOnlyInterviewScene = dynamic(
  () =>
    import("@/components/InterviewCall/InterviewScene").then(
      (mod) => mod.InterviewScene
    ),
  { ssr: false, loading: () => <Loader /> }
);

const InterviewCallContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // State Management
  const [status, setStatus] = useState("Initializing...");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isGeminiSpeaking, setIsGeminiSpeaking] = useState(false);
  const [audioQueue, setAudioQueue] = useState<Blob[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [userSilenceTimer, setUserSilenceTimer] =
    useState<NodeJS.Timeout | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<string>("");
  const [forcedEndCount, setForcedEndCount] = useState(0);

  // Refs
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());

  // Speech recognition for transcription backup
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition if available
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ");
        setCurrentTranscription(transcript);
      };
    }
  }, []);

  // Start silence detection timer
  const startSilenceDetection = () => {
    // Clear any existing timer
    if (userSilenceTimer) {
      clearTimeout(userSilenceTimer);
    }

    // Set a new timer that will force USER_AUDIO_END after 2 seconds of silence
    const timer = setTimeout(() => {
      // Only force end if the user was speaking and now it's been silent for a while
      const timeElapsed = Date.now() - lastActivityTimeRef.current;
      if (timeElapsed > 2000 && isInterviewActive && !isGeminiSpeaking) {
        console.log("Silence detected for 2 seconds, forcing USER_AUDIO_END");
        forceSendUserAudioEnd();
        setForcedEndCount((prev) => prev + 1);
      }
    }, 2000);

    setUserSilenceTimer(timer);
  };

  // Function to force send USER_AUDIO_END with transcription
  const forceSendUserAudioEnd = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "USER_AUDIO_END",
          transcription: currentTranscription,
          forced: true,
        })
      );
      console.log(
        "Forced USER_AUDIO_END sent with transcription:",
        currentTranscription.substring(0, 50) + "..."
      );
    }
  };

  // VAD Hook Integration with streaming callbacks and safety mechanisms
  const {
    isSpeaking: isUserSpeaking,
    start: startVAD,
    stop: stopVAD,
  } = useVAD({
    onSpeechStart: () => {
      setStatus("Listening...");
      // Start speech recognition when user starts speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Speech recognition might already be started
        }
      }
      lastActivityTimeRef.current = Date.now();
    },
    onAudioChunk: (chunk: ArrayBufferLike) => {
      // Update last activity time to prevent premature USER_AUDIO_END
      lastActivityTimeRef.current = Date.now();

      // 1. Check connection state with more detailed error feedback
      if (!wsRef.current) {
        console.error("WebSocket connection not initialized");
        setStatus("Connection error. Please refresh.");
        return;
      }

      // 2. Handle all possible WebSocket states
      switch (wsRef.current.readyState) {
        case WebSocket.OPEN:
          try {
            // 3. Wrap the send in try/catch - WebSocket.send() can throw exceptions
            wsRef.current.send(chunk);
          } catch (err) {
            console.error("Failed to send audio chunk:", err);

            // 4. Show user-friendly error and handle gracefully
            setStatus("Connection issue. Audio may be disrupted.");

            // 5. Optional: Buffer important data for retry
            // audioBufferForRetry.push(chunk);
          }
          break;

        case WebSocket.CONNECTING:
          console.warn("WebSocket still connecting. Dropping audio chunk.");
          setStatus("Establishing connection...");
          break;

        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          console.warn(
            `WebSocket ${
              wsRef.current.readyState === WebSocket.CLOSING
                ? "closing"
                : "closed"
            }. Dropping audio chunk.`
          );
          setStatus("Connection lost. Please refresh.");

          // 6. Try to reconnect automatically
          attemptReconnect();
          break;
      }

      // Reset the silence detection timer since we have audio activity
      startSilenceDetection();
    },
    onSpeechEnd: () => {
      setStatus("Thinking...");
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Speech recognition might already be stopped
        }
      }

      // Send USER_AUDIO_END with transcription when speech ends
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("Natural speech end detected, sending USER_AUDIO_END");
        wsRef.current.send(
          JSON.stringify({
            type: "USER_AUDIO_END",
            transcription: currentTranscription,
          })
        );
      }
    },
  });

  useEffect(() => {
    let rafId: number;
    const analyze = () => {
      lipsyncManager.processAudio();
      rafId = requestAnimationFrame(analyze);
    };
    analyze();
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Audio player setup
  useEffect(() => {
    const player = audioPlayerRef.current;
    if (player) {
      const onEnded = () => {
        console.log("Audio playback ended");
        setIsGeminiSpeaking(false);

        // Cleanup
        URL.revokeObjectURL(player.src);

        // Start listening again when Gemini finishes speaking
        if (isInterviewActive) {
          startVAD();
        }
      };

      // Just handle the ended event - we'll connect lipsync when playing
      player.addEventListener("ended", onEnded);

      return () => {
        player.removeEventListener("ended", onEnded);
      };
    }
  }, [isInterviewActive, startVAD]);

  // WebSocket setup
  useEffect(() => {
    if (!sessionId) {
      setStatus("Error: No session ID.");
      return;
    }
    setStatus("Connecting...");
    const ws = new WebSocket(
      `ws://localhost:8000/interview_call/ws/${sessionId}`
    );
    wsRef.current = ws;
    ws.binaryType = "blob"; // Important: ensure we receive ArrayBuffers
    ws.onopen = () => setStatus("Ready. Press mic to start the interview.");

    // --- THIS IS THE CORRECTED HANDLER ---
    ws.onmessage = (event) => {
      console.log("WebSocket message received:", {
        dataType: typeof event.data,
        isArrayBuffer: event.data instanceof ArrayBuffer,
        isBlob: event.data instanceof Blob,
        byteLength: event.data.byteLength || "N/A",
      });
      // The browser's default binaryType is 'blob'.
      // The backend is sending a complete WAV file, which arrives as a single Blob.
      if (event.data instanceof Blob) {
        console.log("Received audio blob from WebSocket:", event.data);
        setAudioQueue((prev) => [...prev, event.data]);
      }
    };
    // ------------------------------------

    ws.onerror = () => setStatus("Connection error.");
    ws.onclose = () => {
      setIsInterviewActive(false);
      setStatus("Interview Ended.");
    };
    return () => ws.close();
  }, [sessionId]);

  // Audio queue processing
  useEffect(() => {
    if (!isGeminiSpeaking && audioQueue.length > 0) {
      const processQueue = async () => {
        try {
          setIsGeminiSpeaking(true);
          stopVAD(); // Stop listening while Gemini speaks

          // 1. Convert all blobs to ArrayBuffers
          const arrayBuffers = await Promise.all(
            audioQueue.map((blob) => blob.arrayBuffer())
          );

          // 2. Concatenate all ArrayBuffers, properly handling WAV headers
          // We need to remove WAV headers from all but the first chunk
          // The WAV header is 44 bytes
          let totalPcmLength = 0;
          arrayBuffers.forEach((buffer, i) => {
            // Skip the 44-byte header for all chunks after the first
            const dataLength =
              i === 0 ? buffer.byteLength : buffer.byteLength - 44;
            totalPcmLength += dataLength;
          });

          // Create a new buffer for our concatenated audio
          const concatenatedBuffer = new ArrayBuffer(44 + totalPcmLength);
          const view = new Uint8Array(concatenatedBuffer);

          // Copy the header from the first WAV file
          if (arrayBuffers.length > 0) {
            view.set(new Uint8Array(arrayBuffers[0].slice(0, 44)), 0);
          }

          // Now copy the PCM data, skipping headers after the first chunk
          let offset = 44; // Start after the first header
          arrayBuffers.forEach((buffer, i) => {
            const start = i === 0 ? 44 : 44; // Skip header
            const chunk = new Uint8Array(buffer.slice(start));
            view.set(chunk, offset);
            offset += chunk.length;
          });

          // Update the data size in the concatenated WAV header
          const dataSize = concatenatedBuffer.byteLength - 44;
          new DataView(concatenatedBuffer).setUint32(40, dataSize, true);
          // Update the overall file size in the header
          new DataView(concatenatedBuffer).setUint32(4, 36 + dataSize, true);

          // Create a Blob and play it
          const concatenatedBlob = new Blob([concatenatedBuffer], {
            type: "audio/wav",
          });

          // 5. Play the concatenated audio
          const audioUrl = URL.createObjectURL(concatenatedBlob);
          if (audioPlayerRef.current) {
            audioPlayerRef.current.src = audioUrl;

            // Ensure the lipsync is properly connected BEFORE playing
            console.log("Connecting lipsync to audio element");
            try {
              lipsyncManager.connectAudio(audioPlayerRef.current);
            } catch (err) {
              console.error("Error connecting lipsync:", err);
            }

            // Now play the audio
            const playPromise = audioPlayerRef.current.play();
            if (playPromise) {
              playPromise.catch((err) => {
                console.error("Error playing audio:", err);
                setIsGeminiSpeaking(false);
                if (isInterviewActive) startVAD();
              });
            }

            console.log(
              "Playing concatenated audio:",
              concatenatedBlob.size,
              "bytes"
            );
          }
        } catch (error) {
          console.error("Error processing audio:", error);
          setIsGeminiSpeaking(false);
          if (isInterviewActive) startVAD();
        }
      };

      processQueue();
      setAudioQueue([]); // Clear the queue after processing
    }
  }, [audioQueue, isGeminiSpeaking, isInterviewActive, startVAD, stopVAD]);

  const finishInterview = async () => {
    if (!isInterviewActive) {
      router.push(`/Feedback?sessionId=${sessionId}`);
      return;
    }

    // Always send USER_AUDIO_END before finishing, whether or not VAD detects user speaking
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Interview ending, sending final USER_AUDIO_END");
      wsRef.current.send(
        JSON.stringify({
          type: "USER_AUDIO_END",
          transcription: currentTranscription,
          final: true,
        })
      );

      // Small delay to ensure message is sent before closing
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsInterviewActive(false);
    stopVAD();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Speech recognition might already be stopped
      }
    }

    if (userSilenceTimer) {
      clearTimeout(userSilenceTimer);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    setStatus("Finalizing and generating feedback...");

    try {
      const result = await triggerLiveFeedbackGeneration(sessionId as string);

      if (
        result.status === "success" ||
        result.status === "already_processing" ||
        result.status === "exists"
      ) {
        toast({
          title: "Interview Completed",
          description:
            "Your feedback is being prepared. You'll be redirected in a moment.",
          duration: 5000,
        });
        setTimeout(() => {
          router.push(`/Feedback?sessionId=${sessionId}`);
        }, 2000);
      } else {
        toast({
          title: "Error",
          description:
            result.message || "There was an issue processing your interview.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Failed to trigger feedback generation:", error);
      toast({
        title: "Error",
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Update the main button's onClick handler
  const handleMainButtonClick = async () => {
    // IMPORTANT: Resume AudioContext on the first user gesture
    await resumeLipsyncAudio();

    if (isInterviewActive) {
      finishInterview();
    } else {
      setIsInterviewActive(true);
      startVAD();
    }
  };

  // New function for reconnection logic
  const attemptReconnect = () => {
    const MAX_RECONNECT_ATTEMPTS = 3; // Maximum number of reconnection attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        // Reconnection code here
        setStatus(`Reconnecting (attempt ${reconnectAttempts + 1})...`);
      }, 1000 * Math.pow(2, reconnectAttempts)); // Exponential backoff
      setReconnectAttempts((prev) => prev + 1);
    } else {
      setStatus("Connection failed. Please refresh the page.");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "USER_AUDIO_END" }));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4">
      {/* Add a debugging indicator for forced ends if needed */}
      {forcedEndCount > 0 && (
        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          Audio safety triggers: {forcedEndCount}
        </div>
      )}
      <main className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh] max-h-[700px]">
          <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
            <Suspense fallback={<Loader />}>
              <ClientOnlyInterviewScene />
            </Suspense>
          </div>
          <div className="flex flex-col space-y-6">
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl flex-grow relative">
              <UserVideo />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
                <User className="h-4 w-4 mr-1 inline" /> You
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-4 text-center">
              <h3 className="font-semibold text-gray-800">Status</h3>
              <p className="text-gray-600 mt-1">
                {isUserSpeaking ? "Listening..." : status}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center mt-6 p-4 bg-white rounded-lg shadow-xl space-y-2">
          <Button
            onClick={handleMainButtonClick}
            disabled={!isInterviewActive && status === "Connecting..."}
            size="lg"
            className={`w-20 h-20 rounded-full transition-all duration-300 ${
              isInterviewActive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}>
            {isInterviewActive ? <PhoneOff size={40} /> : <Mic size={40} />}
          </Button>
          <label className="text-sm font-medium">
            {isInterviewActive ? "End Interview" : "Start Interview"}
          </label>
        </div>
      </main>
      <audio ref={audioPlayerRef} style={{ display: "none" }} />
    </div>
  );
};

// TypeScript global declarations for the Speech Recognition API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

declare let SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

const InterviewCallPage = () => <InterviewCallContent />;
export default InterviewCallPage;
