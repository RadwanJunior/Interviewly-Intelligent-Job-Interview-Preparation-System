"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
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

  // We use state just to let consumers know when the ref is populated.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!lipsyncManagerRef.current) {
      console.log("Initializing lipsync manager for the first time...");
      try {
        const manager = new Lipsync({
          fftSize: 1024,
          historySize: 4,
        });
        lipsyncManagerRef.current = manager;
        setIsInitialized(true); // Signal that the manager is ready
        console.log("Lipsync manager created and stored in ref.");
      } catch (error) {
        console.error("Failed to initialize lipsync manager:", error);
      }
    }

    // Cleanup function to close the audio context when the app unmounts
    return () => {
      if (lipsyncManagerRef.current) {
        const manager = lipsyncManagerRef.current as any; // Access private property
        if (manager.audioContext && manager.audioContext.state !== "closed") {
          console.log("Closing AudioContext on cleanup.");
          manager.audioContext
            .close()
            .catch((e: any) => console.warn("Error closing AudioContext:", e));
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
