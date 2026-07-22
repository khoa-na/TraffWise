import React, { useState } from "react";
import Header from "../components/Header";
import ControlSection from "../components/ControlSection";
import CameraView from "../components/CameraView";
import ViolationLog from "../components/ViolationLog";
import "./CameraMonitor.css";
import EditPanel from "../components/EditPanel";
import { useParams } from "react-router-dom";

export default function CameraMonitor() {
  const [activePanel, setActivePanel] = useState(null);
  const { cameraId } = useParams();

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
          <CameraView />
        </div>
        {activePanel === "log" && <ViolationLog />}
        {activePanel === "edit" && <EditPanel cameraId={cameraId} />}
      </div>
    </div>
  );
}
