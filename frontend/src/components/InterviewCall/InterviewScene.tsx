"use client";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Avatar } from "./Avatar";
import { useEffect, useState } from "react";
import * as THREE from "three";

export const InterviewScene = () => {
  const [currentHash, setCurrentHash] = useState("");
  const [isContextLost, setIsContextLost] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentHash(window.location.hash.replace("#", ""));
    };
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleCanvasCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    // Make canvas background transparent
    gl.setClearColor(0x000000, 0);

    gl.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      console.error("WEBGL CONTEXT LOST");
      setIsContextLost(true);
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        minHeight: "400px",
        backgroundImage: "url('/images/office-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
      {isContextLost ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            padding: "20px",
            textAlign: "center",
          }}>
          <h3 style={{ marginBottom: "1rem" }}>Rendering Error</h3>
          <p>An unexpected error occurred with the 3D model.</p>
          <p style={{ marginBottom: "1.5rem" }}>
            Please refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              border: "1px solid white",
              borderRadius: "5px",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}>
            Refresh Page
          </button>
        </div>
      ) : (
        <Canvas
          shadows
          camera={{ position: [0, 0, 1.3], fov: 30 }}
          frameloop="always"
          dpr={[1, 1.5]}
          onCreated={handleCanvasCreated}
          gl={{ alpha: true }} // Make canvas transparent
        >
          <Environment preset="sunset" />
          <group position={[-0.05, -1.56, 0]}>
            <Avatar animation={currentHash || "Idle"} />
          </group>
          <OrbitControls enabled={false} />
        </Canvas>
      )}
    </div>
  );
};
