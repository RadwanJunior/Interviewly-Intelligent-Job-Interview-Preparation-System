// "use client";
// import React, { createContext, useContext, useState, useRef } from "react";
// import { Lipsync, VISEMES } from "wawa-lipsync";

// // Context type with initialize function
// type LipsyncContextType = {
//   lipsyncManager: Lipsync | null;
//   initialize: () => void;
//   isInitialized: boolean;
// };

// const LipsyncContext = createContext<LipsyncContextType>({
//   lipsyncManager: null,
//   initialize: () => {},
//   isInitialized: false,
// });

// export const LipsyncProvider = ({
//   children,
// }: {
//   children: React.ReactNode;
// }) => {
//   const [lipsyncManager, setLipsyncManager] = useState<Lipsync | null>(null);
//   const [isInitialized, setIsInitialized] = useState(false);
//   const initAttemptedRef = useRef(false);

//   const initialize = () => {
//     // Only initialize once and only after user interaction
//     if (initAttemptedRef.current || typeof window === "undefined") return;

//     try {
//       console.log("Initializing lipsync manager...");
//       initAttemptedRef.current = true;

//       // Create the manager with more explicit options
//       const manager = new Lipsync({
//         fftSize: 1024, // Larger FFT size for better frequency resolution
//         historySize: 4, // Increased history for smoother transitions
//       });

//       setLipsyncManager(manager);
//       setIsInitialized(true);
//       console.log("Lipsync manager initialized successfully");

//       // Log available visemes for debugging
//       console.log("Available visemes:", Object.values(VISEMES));
//     } catch (error) {
//       console.error("Failed to initialize lipsync manager:", error);
//     }
//   };

//   // Ensure cleanup on unmount to prevent memory leaks
//   React.useEffect(() => {
//     return () => {
//       if (lipsyncManager) {
//         try {
//           // Clean up AudioContext if possible
//           const audioContext = (lipsyncManager as any).audioContext;
//           if (audioContext && audioContext.state !== "closed") {
//             audioContext
//               .close()
//               .catch((e) => console.warn("Error closing AudioContext:", e));
//           }
//         } catch (e) {
//           console.warn("Error during lipsync manager cleanup:", e);
//         }
//       }
//     };
//   }, [lipsyncManager]);

//   return (
//     <LipsyncContext.Provider
//       value={{ lipsyncManager, initialize, isInitialized }}>
//       {children}
//     </LipsyncContext.Provider>
//   );
// };

// export const useLipsync = () => {
//   // Only check for provider in client context
//   const context = useContext(LipsyncContext);
//   if (typeof window !== "undefined" && !context) {
//     console.warn("useLipsync must be used within a LipsyncProvider");
//   }
//   return context;
// };

// src/context/LipsyncContext.tsx
"use client";
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
  // REASONING: We use a ref to hold the Lipsync instance.
  // This ensures that we create it ONLY ONCE and it remains stable
  // across re-renders, preventing AudioContext errors and broken references.
  const lipsyncManagerRef = useRef<Lipsync | null>(null);

  // We use state just to let consumers know when the ref is populated.
  const [isInitialized, setIsInitialized] = useState(false);

  // REASONING: We create the manager instance here, once, when the provider mounts.
  // This avoids re-creating it on every button click.
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
