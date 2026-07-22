import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import ControlSection from "../components/ControlSection";
import CameraView from "../components/CameraView";
import ViolationLog from "../components/ViolationLog";
import "./CameraMonitor.css";
import EditPanel from "../components/EditPanel";
import { useParams } from "react-router-dom";
import { API_URL } from "../api";

export default function CameraMonitor() {
  const [activePanel, setActivePanel] = useState(null);
  const { cameraId } = useParams();
  const [readyCamera, setReadyCamera] = useState(null);

  useEffect(() => {
    let active = true;
    setReadyCamera(null);

    const prepareCamera = async () => {
      try {
        await fetch(`${API_URL}/set_model`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model_type: "yolo11" }),
        });
        await fetch(`${API_URL}/toggle_annotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_annotations: true }),
        });
        const response = await fetch(`${API_URL}/set_camera`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ camera_id: cameraId }),
        });
        if (!response.ok) throw new Error("Failed to select camera");
        if (active) setReadyCamera(cameraId);
      } catch (error) {
        console.error("Error preparing camera:", error);
      }
    };

    prepareCamera();
    return () => {
      active = false;
    };
  }, [cameraId]);

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="camera-monitor">
      <Header />
      <div
        className={`camera-monitor-content ${activePanel ? "with-panel" : ""}`}
      >
        <div className="main-section">
          <ControlSection
            togglePanel={togglePanel}
            activePanel={activePanel}
            cameraId={cameraId}
          />
          {readyCamera === cameraId ? (
            <CameraView />
          ) : (
            <div className="camera-view">Preparing camera...</div>
          )}
        </div>
        {activePanel === "log" && <ViolationLog />}
        {activePanel === "edit" && <EditPanel cameraId={cameraId} />}
      </div>
    </div>
  );
}
