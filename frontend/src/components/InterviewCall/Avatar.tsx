"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VISEMES } from "wawa-lipsync";
// FIX: Import the singleton manager directly
import { lipsyncManager } from "@/lib/lipsync";

export function Avatar({ animation, ...props }: any) {
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
        // Blink logic
        const eyeBlinkLeftIndex = object.morphTargetDictionary["eyeBlinkLeft"];
        if (eyeBlinkLeftIndex !== undefined) {
          object.morphTargetInfluences[eyeBlinkLeftIndex] =
            THREE.MathUtils.lerp(
              object.morphTargetInfluences[eyeBlinkLeftIndex],
              blink ? 1 : 0,
              0.5
            );
        }
        // ... (rest of blink logic)
        const eyeBlinkRightIndex =
          object.morphTargetDictionary["eyeBlinkRight"];
        if (eyeBlinkRightIndex !== undefined) {
          object.morphTargetInfluences[eyeBlinkRightIndex] =
            THREE.MathUtils.lerp(
              object.morphTargetInfluences[eyeBlinkRightIndex],
              blink ? 1 : 0,
              0.5
            );
        }

        // Lipsync logic using the singleton
        const currentViseme = lipsyncManager.viseme || VISEMES.sil;
        Object.values(VISEMES).forEach((viseme: any) => {
          const index = object.morphTargetDictionary![viseme];
          if (index !== undefined) {
            const targetValue = viseme === currentViseme ? 1 : 0;
            object.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              object.morphTargetInfluences[index],
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
