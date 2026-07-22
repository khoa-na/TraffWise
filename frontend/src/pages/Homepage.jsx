import React from "react";
import Header from "../components/Header";
import CamerasPage from "../components/CamerasPage";
import "./Homepage.css";

export default function Homepage() {
  return (
    <div className="homepage">
      <Header />
      <div className="page-header">
        <h1>Traffic Monitoring System</h1>
        <p>
          Select a camera to view live traffic updates or upload a recording.
        </p>
      </div>
      <CamerasPage />
    </div>
  );
}
