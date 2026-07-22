import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import CameraMonitor from "./pages/CameraMonitor";
import ViolationPage from "./pages/ViolationPage";
import ViolationDetail from "./pages/ViolationDetail";
import { DataProvider } from "./contexts/DataProvider";
import TestingPage from "./pages/TestingPage";

export default function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/monitor/:cameraId" element={<CameraMonitor />} />
          <Route path="/violations" element={<ViolationPage />} />
          <Route path="/violations/:id" element={<ViolationDetail />} />
          <Route path="/test" element={<TestingPage />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
