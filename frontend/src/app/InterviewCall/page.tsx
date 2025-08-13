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

  // Refs
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // VAD Hook Integration with streaming callbacks
  // In InterviewCallContent.tsx

  const {
    isSpeaking: isUserSpeaking,
    start: startVAD,
    stop: stopVAD,
  } = useVAD({
    onSpeechStart: () => {
      setStatus("Listening...");
    },
    onAudioChunk: (chunk: ArrayBufferLike) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // The chunk is already in the correct Int16 format from our hook.
        // Just send it.
        wsRef.current.send(chunk);
      }
    },
    onSpeechEnd: () => {
      setStatus("Thinking...");
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "USER_AUDIO_END" }));
      }
    },
  });

  // const processAudioQueue = () => {
  //   if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
  //     setIsGeminiSpeaking(false);
  //     // When the queue is empty and playback has finished, start listening again.
  //     if (isInterviewActive) {
  //       startVAD();
  //     }
  //     return;
  //   }

  //   setIsGeminiSpeaking(true);

  //   const audioData = audioQueueRef.current.shift()!; // Get the next chunk
  //   const audioBuffer = new Int16Array(audioData); // The backend sends raw PCM16 bytes

  //   // The audio from Gemini is 24000 Hz, 1 channel
  //   const geminiSampleRate = 24000;
  //   const frameCount = audioBuffer.length;
  //   const myArrayBuffer = audioContextRef.current.createBuffer(
  //     1,
  //     frameCount,
  //     geminiSampleRate
  //   );
  //   const nowBuffering = myArrayBuffer.getChannelData(0);

  //   for (let i = 0; i < frameCount; i++) {
  //     // Convert Int16 back to Float32 for Web Audio API
  //     nowBuffering[i] = audioBuffer[i] / 32767;
  //   }

  //   const source = audioContextRef.current.createBufferSource();
  //   source.buffer = myArrayBuffer;
  //   source.connect(audioContextRef.current.destination);
  //   // Also connect to your lipsync manager if it has a Web Audio Node input
  //   // lipsyncManager.connectNode(source);

  //   const currentTime = audioContextRef.current.currentTime;
  //   const playTime = Math.max(currentTime, nextPlayTimeRef.current);

  //   source.start(playTime);
  //   nextPlayTimeRef.current = playTime + myArrayBuffer.duration;

  //   source.onended = processAudioQueue; // When this chunk finishes, play the next
  // };
  // Lipsync processing loop
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
            // IMPORTANT: Set the correct MIME type
            const concatenatedBlob = new Blob([concatenatedBuffer], {
              type: "audio/wav", // This already sets the MIME type correctly
            });
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
      // If the interview is already over, just navigate
      // router.push(`/Feedback?sessionId=${sessionId}`);
      return;
    }

    // 1. Stop all client-side processes
    setIsInterviewActive(false);
    stopVAD();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    setStatus("Finalizing and generating feedback...");

    try {
      // 2. Use the API function instead of direct fetch
      const result = await triggerLiveFeedbackGeneration(sessionId as string);

      if (
        result.status === "success" ||
        result.status === "already_processing" ||
        result.status === "exists"
      ) {
        // Show success message
        toast({
          title: "Interview Completed",
          description:
            "Your feedback is being prepared. You'll be redirected in a moment.",
          duration: 5000,
        });

        // Wait 2 seconds before redirecting to give user time to read the message
        // setTimeout(() => {
        //   router.push(`/Feedback?sessionId=${sessionId}`);
        // }, 2000);
      } else {
        // Show error
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

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4">
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

const InterviewCallPage = () => <InterviewCallContent />;
export default InterviewCallPage;
