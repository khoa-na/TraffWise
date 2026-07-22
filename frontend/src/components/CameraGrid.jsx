import React from "react";
import CameraCard from "./CameraCard";
import "./CameraGrid.css";
import "./CameraCard.css";

export default function CameraGrid({ cameras, onAddCamera, onRemoveCamera }) {
  return (
    <div className="camera-grid">
      {cameras.map((camera) => (
        <CameraCard key={camera.id} camera={camera} onRemove={onRemoveCamera} />
      ))}

      {/* Add New Camera Card */}
      {/* <div className="camera-card add-camera" onClick={onAddCamera}>
        <div className="add-icon">+</div>
        <p>Add New Camera</p>
      </div> */}
    </div>
  );
}
