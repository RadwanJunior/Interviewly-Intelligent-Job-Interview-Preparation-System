// "use client";
// import { Canvas } from "@react-three/fiber";
// import { Environment, OrbitControls } from "@react-three/drei";
// import { Avatar } from "./Avatar";
// import { useEffect, useState, useRef } from "react";

// export const InterviewScene = () => {
//   const [currentHash, setCurrentHash] = useState("");
//   const canvasContainerRef = useRef<HTMLDivElement>(null);
//   const [hasError, setHasError] = useState(false);
//   const [recoveryAttempts, setRecoveryAttempts] = useState(0);

//   // Handle hash changes for animations
//   useEffect(() => {
//     setCurrentHash(window.location.hash.replace("#", ""));
//     const handleHashChange = () => {
//       setCurrentHash(window.location.hash.replace("#", ""));
//     };
//     window.addEventListener("hashchange", handleHashChange);
//     return () => {
//       window.removeEventListener("hashchange", handleHashChange);
//     };
//   }, []);

//   // Error handler with improved logging
//   const handleContextLost = (event: any) => {
//     event.preventDefault(); // Important: Prevent browser default handling
//     console.error("WebGL context lost:", event);
//     setHasError(true);

//     // Schedule a recovery attempt
//     if (recoveryAttempts < 3) {
//       const timeout = setTimeout(() => {
//         setHasError(false);
//         setRecoveryAttempts((prev) => prev + 1);
//       }, 2000);

//       return () => clearTimeout(timeout);
//     }
//   };

//   // Recovery handler
//   const handleContextRestored = () => {
//     console.log("WebGL context restored");
//     setHasError(false);
//     setRecoveryAttempts(0);
//   };

//   // Set up WebGL context loss handlers
//   useEffect(() => {
//     const canvas = canvasContainerRef.current?.querySelector("canvas");
//     if (canvas) {
//       canvas.addEventListener("webglcontextlost", handleContextLost);
//       canvas.addEventListener("webglcontextrestored", handleContextRestored);

//       return () => {
//         canvas.removeEventListener("webglcontextlost", handleContextLost);
//         canvas.removeEventListener(
//           "webglcontextrestored",
//           handleContextRestored
//         );
//       };
//     }
//   }, [recoveryAttempts]);

//   return (
//     <div
//       ref={canvasContainerRef}
//       style={{
//         width: "100%",
//         height: "100%",
//         position: "relative",
//         minHeight: "400px",
//       }}>
//       {hasError ? (
//         <div
//           style={{
//             position: "absolute",
//             top: 0,
//             left: 0,
//             width: "100%",
//             height: "100%",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             backgroundColor: "#1a1a1a",
//             color: "white",
//             padding: "20px",
//             textAlign: "center",
//           }}>
//           <div>
//             <h3>3D rendering error</h3>
//             <p>The 3D model could not be displayed. Please try refreshing.</p>
//           </div>
//         </div>
//       ) : (
//         <Canvas
//           shadows
//           camera={{ position: [0, 0, 1.5], fov: 35 }} // Changed camera position
//           style={{ width: "100%", height: "100%" }}
//           gl={{
//             powerPreference: "default",
//             antialias: true,
//             depth: true,
//             stencil: false,
//             alpha: false,
//             preserveDrawingBuffer: false,
//             failIfMajorPerformanceCaveat: false,
//           }}
//           frameloop="demand"
//           dpr={[1, 1.5]} // Reduced max pixel ratio for better performance
//           performance={{ min: 0.5 }} // Allow throttling for better stability
//         >
//           <Environment preset="sunset" />
//           <group position={[0, -1.5, 0]}>
//             <Avatar animation={currentHash || "Idle"} />
//           </group>
//           <OrbitControls enabled={false} />
//         </Canvas>
//       )}
//     </div>
//   );
// };

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
        background: "#111",
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
          camera={{ position: [0, 0, 1.5], fov: 35 }}
          frameloop="always"
          dpr={[1, 1.5]}
          onCreated={handleCanvasCreated}>
          <Environment preset="sunset" />
          <group position={[0, -1.5, 0]}>
            <Avatar animation={currentHash || "Idle"} />
          </group>
          <OrbitControls enabled={false} />
        </Canvas>
      )}
    </div>
  );
};
