"use client";
import React, { createContext, useContext, useRef, useEffect } from "react";
import { Lipsync } from "wawa-lipsync";

// FIX: The context type now just provides the manager instance.
// The initialization state is managed internally.
type LipsyncContextType = {
  lipsyncManager: Lipsync | null;
};

const LipsyncContext = createContext<LipsyncContextType>({
  lipsyncManager: null,
});

export const LipsyncProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const lipsyncManagerRef = useRef<Lipsync | null>(null);

  useEffect(() => {
    if (!lipsyncManagerRef.current) {
      console.log("Initializing lipsync manager for the first time...");
      try {
        const manager = new Lipsync({
          fftSize: 1024,
          historySize: 4,
        });
        lipsyncManagerRef.current = manager;
        console.log("Lipsync manager created and stored in ref.");
      } catch (error) {
        console.error("Failed to initialize lipsync manager:", error);
      }
    }

    // Cleanup function to close the audio context when the app unmounts
    return () => {
      if (lipsyncManagerRef.current) {
        const manager = lipsyncManagerRef.current as unknown as {
          audioContext?: AudioContext;
        };
        if (manager.audioContext && manager.audioContext.state !== "closed") {
          console.log("Closing AudioContext on cleanup.");
          manager.audioContext.close().catch((error: unknown) => {
            console.warn("Error closing AudioContext:", error);
          });
        }
      }
    };
  }, []); // Empty dependency array ensures this runs only once.

  return (
    <LipsyncContext.Provider
      value={{
        lipsyncManager: lipsyncManagerRef.current,
      }}>
      {children}
    </LipsyncContext.Provider>
  );
};

export const useLipsync = () => {
  const context = useContext(LipsyncContext);
  if (!context) {
    throw new Error("useLipsync must be used within a LipsyncProvider");
  }
  return context;
};
