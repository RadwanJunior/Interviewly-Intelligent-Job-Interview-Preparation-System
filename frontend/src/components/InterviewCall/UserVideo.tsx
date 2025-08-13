"use client";

import React, { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

export const UserVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const enableStream = async () => {
      try {
        // Request access to the user's camera
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false, // We only need video for this component
        });
        setStream(currentStream);
        if (videoRef.current) {
          // Attach the stream to the video element
          videoRef.current.srcObject = currentStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError(
          "Camera access denied. Please enable permissions in your browser."
        );
      }
    };

    enableStream();

    // Cleanup function to stop the camera when the component unmounts
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
      {error ? (
        <div className="text-center text-red-400 px-4">
          <CameraOff className="h-12 w-12 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // VERY IMPORTANT: Mute the video to prevent audio echo
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }} // Flip the video horizontally for a "mirror" effect
        />
      )}
    </div>
  );
};
