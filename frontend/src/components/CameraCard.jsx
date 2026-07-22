import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import "./CameraCard.css";

export default function CameraCard({ camera, onRemove }) {
  const navigate = useNavigate();

  const handleViewCamera = () => {
    navigate(`/monitor/${camera.id}`);
  };

  return (
    <div className="camera-card">
      <button className="remove-btn" onClick={() => onRemove(camera.id)}>
        <X size={15} />
      </button>

      <div className="camera-content">
        <h2>{camera.name}</h2>
        <p>📍 {camera.location}</p>
        <p className={`status ${camera.status}`}>
          {camera.status === "active" ? "🟢 Active" : "🔴 Inactive"}
        </p>

        {camera.status === "active" ? (
          <button onClick={handleViewCamera} className="cam-btn view-live">
            ▶ View
          </button>
        ) : (
          <button className="cam-btn upload-video">⬆ Upload</button>
        )}
      </div>
    </div>
  );
}
