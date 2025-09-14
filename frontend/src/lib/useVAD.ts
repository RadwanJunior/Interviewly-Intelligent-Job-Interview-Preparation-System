"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MicVAD } from "@ricky0123/vad-web";

// Helper function to convert browser's 32-bit float audio to 16-bit integer PCM
const float32ToInt16 = (buffer: Float32Array): Int16Array => {
  let l = buffer.length;
  const output = new Int16Array(l);
  while (l--) {
    // Clamp the value between -1 and 1, then scale to 16-bit range
    output[l] = Math.max(-1, Math.min(1, buffer[l])) * 0x7fff;
  }
  return output;
};

interface UseVADProps {
  onSpeechStart: () => void;
  onAudioChunk: (chunk: ArrayBufferLike) => void;
  onSpeechEnd: () => void;
}

export function useVAD({
  onSpeechStart,
  onAudioChunk,
  onSpeechEnd,
}: UseVADProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vadRef = useRef<MicVAD | null>(null);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const stop = useCallback(() => {
    vadRef.current?.pause();
    setIsSpeaking(false);
  }, []);

  const start = useCallback(async () => {
    try {
      if (vadRef.current) {
        vadRef.current.start();
        return;
      }
      const vad = await MicVAD.new({
        additionalAudioConstraints: { sampleRate: 16000 },
        onSpeechStart: () => {
          setIsSpeaking(true);
          onSpeechStart();
        },
        onSpeechEnd: () => {
          setIsSpeaking(false);
          onSpeechEnd();
        },
        // FIX: The first argument's type isn't exported, and we don't use it.
        // We only care about the second argument, the Float32Array frame.
        onFrameProcessed: (_, frame: Float32Array) => {
          if (isSpeakingRef.current) {
            const int16Frame = float32ToInt16(frame);
            // Send the raw ArrayBuffer of the *correctly formatted* audio
            onAudioChunk(int16Frame.buffer);
          }
        },
      });
      vadRef.current = vad;
      vad.start();
    } catch (e) {
      console.error("Failed to start VAD", e);
    }
  }, [onSpeechStart, onAudioChunk, onSpeechEnd]);

  useEffect(() => {
    return () => vadRef.current?.destroy();
  }, []);

  return { isSpeaking, start, stop };
}
