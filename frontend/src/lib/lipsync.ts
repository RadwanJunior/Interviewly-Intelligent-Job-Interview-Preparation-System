import { Lipsync } from "wawa-lipsync";

// declared once for the entire application's lifecycle. It starts as null.
let lipsyncManagerInstance: Lipsync | null = null;

/**
 * This function is the gatekeeper for accessing the lipsync manager.
 */
export const getLipsyncManager = (): Lipsync => {
  // On the server, this check passes, and we return a harmless mock object.
  // This code does not affect the client-side instance.
  if (typeof window === "undefined") {
    return {
      processAudio: () => {},
      connectAudio: () => {},
      viseme: "viseme_sil",
    } as any;
  }

  // This is the core of the singleton logic for the client.
  // It checks if the instance has already been created.
  if (!lipsyncManagerInstance) {
    // If it hasn't been created yet, this block runs ONLY ONCE.
    console.log("Initializing Lipsync Manager for the first time.");
    // A new Lipsync object is created and stored in our module-level variable.
    lipsyncManagerInstance = new Lipsync({
      fftSize: 1024,
      historySize: 4,
    });
  }

  // For every subsequent call to this function, the `if` block is skipped,
  // and the already-created instance is returned immediately.
  return lipsyncManagerInstance;
};

/**
 * Safely resumes the AudioContext managed by the Lipsync instance.
 * This should be called after the first user gesture (e.g., a button click).
 */
export const resumeLipsyncAudio = async () => {
  // We only proceed if the manager has been initialized on the client
  if (lipsyncManagerInstance) {
    // We use a type assertion to access the private 'audioContext'.
    // This is a controlled way to bypass the private modifier for this specific, necessary action.
    const audioContext = (lipsyncManagerInstance as any)
      .audioContext as AudioContext;
    if (audioContext && audioContext.state === "suspended") {
      console.log("AudioContext is suspended. Resuming...");
      await audioContext.resume();
      console.log("AudioContext has been resumed.");
    }
  }
};

// This line runs when the module is first loaded on the client.
// It calls the function above, which creates and stores the single instance.
// Any component that imports `lipsyncManager` gets this exact same constant object.
export const lipsyncManager = getLipsyncManager();
