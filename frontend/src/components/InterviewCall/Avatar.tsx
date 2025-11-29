"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { VISEMES } from "wawa-lipsync";
// Import the singleton manager directly
import { lipsyncManager } from "@/lib/lipsync";

type AvatarProps = ThreeElements["group"] & {
  animation?: string;
};

export function Avatar({ animation = "Idle", ...props }: AvatarProps) {
  const group = useRef<THREE.Group>(null!);
  const { scene } = useGLTF("/models/lisa.glb");
  const { animations } = useGLTF("/models/animations.glb");
  const { actions } = useAnimations(animations, group);

  // the imported lipsyncManager singleton
  const [blink, setBlink] = useState(false);

  // Animation logic remains the same
  useEffect(() => {
    const action = actions[animation] || actions["Idle"];
    if (action) {
      action.reset().fadeIn(0.5).play();
      return () => {
        action.fadeOut(0.5);
      };
    }
  }, [animation, actions]);

  // The useFrame logic is now stable because lipsyncManager is a constant.
  useFrame(() => {
    group.current.traverse((object) => {
      if (
        object instanceof THREE.SkinnedMesh &&
        object.morphTargetDictionary &&
        object.morphTargetInfluences
      ) {
        const influences = object.morphTargetInfluences;

        // Blink logic
        const eyeBlinkLeftIndex = object.morphTargetDictionary["eyeBlinkLeft"];
        if (eyeBlinkLeftIndex !== undefined) {
          influences[eyeBlinkLeftIndex] = THREE.MathUtils.lerp(
            influences[eyeBlinkLeftIndex],
            blink ? 1 : 0,
            0.5
          );
        }
        // ... (rest of blink logic)
        const eyeBlinkRightIndex =
          object.morphTargetDictionary["eyeBlinkRight"];
        if (eyeBlinkRightIndex !== undefined) {
          influences[eyeBlinkRightIndex] = THREE.MathUtils.lerp(
            influences[eyeBlinkRightIndex],
            blink ? 1 : 0,
            0.5
          );
        }

        // Lipsync logic using the singleton
        const currentViseme = lipsyncManager.viseme || VISEMES.sil;
        Object.values(VISEMES).forEach((viseme) => {
          const visemeKey = viseme as string;
          const index = object.morphTargetDictionary![visemeKey];
          if (index !== undefined) {
            const targetValue = viseme === currentViseme ? 1 : 0;
            influences[index] = THREE.MathUtils.lerp(
              influences[index],
              targetValue,
              0.2
            );
          }
        });
      }
    });
  });

  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 200);
        nextBlink();
      }, THREE.MathUtils.randInt(2000, 7000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/lisa.glb");
useGLTF.preload("/models/animations.glb");
