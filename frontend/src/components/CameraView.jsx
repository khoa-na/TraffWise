import React, { useEffect, useState } from "react";
import "./CameraView.css";
import { useParams } from "react-router-dom";
import { API_URL } from "../api";

export default function CameraView() {
  const { cameraId } = useParams();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!hasError) return;

    const retry = setTimeout(() => setHasError(false), 3000);
    return () => clearTimeout(retry);
  }, [hasError]);

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <div className="camera-view" key={cameraId}>
      {!hasError ? (
        <img
          className="camera-feed"
          src={`${API_URL}/video_feed`}
          alt="Live Camera Feed"
          onError={handleImageError}
        />
      ) : (
        <div className="no-signal">
          <div className="no-signal-text">No Signal</div>
          <div className="no-signal-overlay"></div>
        </div>
      )}
    </div>
  );
}
