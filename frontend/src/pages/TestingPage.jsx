import React, { useState, useRef } from "react";
import Header from "../components/Header";
import {
  FaUpload,
  FaSearch,
  FaImage,
  FaFileImage,
  FaCar,
  FaIdCard,
} from "react-icons/fa";
import "./TestingPage.css";

export default function TestingPage() {
  // State for OCR testing
  const [ocrState, setOcrState] = useState({
    selectedImage: null,
    previewUrl: null,
    isProcessing: false,
    results: null,
    error: null,
  });
  const ocrFileInputRef = useRef(null);

  // State for pipeline testing
  const [pipelineState, setPipelineState] = useState({
    selectedImage: null,
    previewUrl: null,
    isProcessing: false,
    results: null,
    error: null,
  });
  const pipelineFileInputRef = useRef(null);

  const handleImageSelect = (type, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      updateState(type, { error: "Please upload an image file" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateState(type, {
        selectedImage: file,
        previewUrl: reader.result,
        error: null,
        results: null,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (type, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) {
        updateState(type, { error: "Please upload an image file" });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        updateState(type, {
          selectedImage: file,
          previewUrl: reader.result,
          error: null,
          results: null,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateState = (type, newState) => {
    if (type === "ocr") {
      setOcrState((prev) => ({ ...prev, ...newState }));
    } else {
      setPipelineState((prev) => ({ ...prev, ...newState }));
    }
  };

  const processImage = async (type) => {
    const state = type === "ocr" ? ocrState : pipelineState;

    if (!state.selectedImage) {
      updateState(type, { error: "Please select an image first" });
      return;
    }

    updateState(type, { isProcessing: true, error: null });

    try {
      const formData = new FormData();
      formData.append("image", state.selectedImage);

      const endpoint =
        type === "ocr"
          ? "http://localhost:8000/api/test/ocr"
          : "http://localhost:8000/api/test/pipeline";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `${type} processing failed`);
      }

      updateState(type, { results: data });
    } catch (err) {
      console.error(`Error processing ${type}:`, err);
      updateState(type, {
        error: `Failed to process image: ${err.message || "Unknown error"}`,
      });
    } finally {
      updateState(type, { isProcessing: false });
    }
  };

  const renderUploadSection = (type, fileInputRef, state, icon) => (
    <div className="upload-section">
      <h4>Upload {type === "ocr" ? "License Plate" : "Traffic Scene"} Image</h4>
      <div
        className="drop-area"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(type, e)}
        onClick={() => fileInputRef.current.click()}
      >
        {state.previewUrl ? (
          <div className="image-preview-container">
            <img
              src={state.previewUrl}
              alt="Preview"
              className="image-preview"
            />
          </div>
        ) : (
          <div className="upload-placeholder">
            {icon}
            <p>
              Drag & drop{" "}
              {type === "ocr" ? "a license plate" : "a traffic scene"} image or
              click to browse
            </p>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleImageSelect(type, e)}
          accept="image/*"
          style={{ display: "none" }}
        />
      </div>

      <button
        className={`process-button ${type !== "ocr" ? "pipeline-button" : ""}`}
        onClick={() => processImage(type)}
        disabled={!state.selectedImage || state.isProcessing}
      >
        {state.isProcessing
          ? "Processing..."
          : type === "ocr"
          ? "Process License Plate"
          : "Process Traffic Scene"}
        {!state.isProcessing && <FaSearch className="button-icon" />}
      </button>
    </div>
  );

  const renderOcrResults = () => (
    <div className="results-section">
      <h4>OCR Results</h4>
      {ocrState.error && <div className="error-message">{ocrState.error}</div>}

      {ocrState.results ? (
        <div className="ocr-results">
          <div className="result-item">
            <strong>Detected Text:</strong>
            <span className="license-plate-text">{ocrState.results.text}</span>
          </div>

          <div className="result-item">
            <strong>Confidence:</strong>
            <span>{ocrState.results.confidence.toFixed(2)}%</span>
          </div>
        </div>
      ) : (
        <div className="no-results">
          {ocrState.selectedImage
            ? 'Upload an image and click "Process License Plate" to see OCR results'
            : "No results to display. Please upload a license plate image first."}
        </div>
      )}
    </div>
  );

  const renderPipelineResults = () => (
    <div className="results-section pipeline-results">
      <h4>Detection Results</h4>
      {pipelineState.error && (
        <div className="error-message">{pipelineState.error}</div>
      )}

      {pipelineState.results ? (
        <div className="pipeline-results-content">
          <div className="processed-image-container">
            <img
              src={`data:image/jpeg;base64,${pipelineState.results.annotated_image}`}
              alt="Processed scene"
              className="processed-image"
            />
          </div>

          <div className="detection-results">
            <h5>Detected Vehicles: {pipelineState.results.vehicles.length}</h5>
            <div className="vehicles-list">
              {pipelineState.results.vehicles.map((vehicle, index) => (
                <div key={index} className="vehicle-item">
                  <div className="vehicle-header">
                    <span className="vehicle-type">{vehicle.type}</span>
                    <span className="vehicle-confidence">
                      {(vehicle.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="vehicle-images-container">
                    <div className="vehicle-image-section">
                      <div className="image-label">Vehicle:</div>
                      <img
                        src={
                          vehicle.vehicle_image
                            ? `data:image/jpeg;base64,${vehicle.vehicle_image}`
                            : "https://placehold.co/400x300?text=No+Vehicle+Image"
                        }
                        alt="Vehicle"
                        className="vehicle-crop-image"
                      />
                    </div>

                    {vehicle.license_plate && (
                      <div className="license-plate-section">
                        <div className="license-plate-header">
                          <div className="image-label">License Plate:</div>
                          <span className="license-plate-value">
                            {vehicle.license_plate}
                          </span>
                          <span className="confidence-badge">
                            {(vehicle.license_plate_confidence * 100).toFixed(
                              1
                            )}
                            %
                          </span>
                        </div>
                        <img
                          src={
                            vehicle.license_plate_image
                              ? `data:image/jpeg;base64,${vehicle.license_plate_image}`
                              : "https://placehold.co/400x150?text=No+Plate+Image"
                          }
                          alt="License plate"
                          className="license-plate-image"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-results">
          {pipelineState.selectedImage
            ? 'Upload a traffic scene image and click "Process Traffic Scene" to see detection results'
            : "No results to display. Please upload a traffic scene image first."}
        </div>
      )}
    </div>
  );

  return (
    <div className="testing-page">
      <Header />
      <div className="testing-container">
        <div className="testing-sections">
          <div className="testing-section">
            <h3 className="testing-section-title">
              <FaIdCard className="testing-section-icon" />
              License Plate OCR Testing
            </h3>
            <div className="ocr-testing-container">
              {renderUploadSection(
                "ocr",
                ocrFileInputRef,
                ocrState,
                <FaFileImage size={48} />
              )}
              {renderOcrResults()}
            </div>
          </div>

          <div className="testing-section">
            <h3 className="section-title">
              <FaCar className="section-icon" />
              Detection Pipeline Testing
            </h3>
            <div className="pipeline-testing-container">
              {renderUploadSection(
                "pipeline",
                pipelineFileInputRef,
                pipelineState,
                <FaCar size={48} />
              )}
              {renderPipelineResults()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
