import { CameraControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";

// This is now a standard functional component.
export const Experience = () => {
  // Provide the correct type for the CameraControls ref.
  const controls = useRef<CameraControls | null>(null);

  useEffect(() => {
    // Add a null check to ensure controls.current is available.
    if (controls.current) {
      controls.current.setLookAt(1, 2.2, 10, 0, 1.5, 0);
      controls.current.setLookAt(0.1, 1.7, 1, 0, 1.5, 0, true);
    }
  }, []);

  return (
    <>
      <CameraControls ref={controls} />
      <directionalLight position={[1, 0.5, -3]} intensity={2} color="blue" />
      <directionalLight position={[-1, 0.5, -2]} intensity={2} color="red" />
      <directionalLight position={[1, 1, 3]} intensity={2} />
      {/* The Avatar is rendered here without a ref. */}
      <Avatar />
    </>
  );
};
