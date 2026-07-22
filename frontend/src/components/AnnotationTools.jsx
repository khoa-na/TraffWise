import React, { useState } from "react";
import CameraView from "./CameraView";
import EditPanel from "./EditPanel";
import "./AnnotationTools.css";

export default function AnnotationTools() {
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [mode, setMode] = useState(null);

  const toggleEditPanel = () => setShowEditPanel(!showEditPanel);

  return (
    <div className="annotation-container">
      <CameraView mode={mode} />
      <button className="toggle-edit-btn" onClick={toggleEditPanel}>
        {showEditPanel ? "Close Tools" : "Open Tools"}
      </button>
      {showEditPanel && <EditPanel setMode={setMode} />}
    </div>
  );
}
