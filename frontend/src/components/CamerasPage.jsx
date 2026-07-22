import React from "react";
import CameraGrid from "./CameraGrid";
import { useData } from "../contexts/DataProvider";

export default function CameraPage() {
  const { cameras, setCameras } = useData();

  const handleAddCamera = () => {
    const newCamera = {
      id: cameras.length + 1,
      name: `Camera ${cameras.length + 1}`,
      location: `Location ${cameras.length + 1}`,
      status: "inactive",
    };
    setCameras([...cameras, newCamera]);
  };

  const handleRemoveCamera = (id) => {
    setCameras(cameras.filter((camera) => camera.id !== id));
  };

  return (
    <CameraGrid
      cameras={cameras}
      onAddCamera={handleAddCamera}
      onRemoveCamera={handleRemoveCamera}
    />
  );
}
