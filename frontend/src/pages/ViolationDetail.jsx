import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import "./ViolationDetail.css";

export default function ViolationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchViolation = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:8000/api/violations/${id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch violation details");
        }

        const data = await response.json();
        setViolation(data);
      } catch (err) {
        console.error("Error fetching violation:", err);
        setError("Failed to load violation details");

        const { violations } = JSON.parse(
          localStorage.getItem("trafficData") || "{}"
        );
        if (violations) {
          const found = violations.find((v) => v.id === id);
          if (found) {
            setViolation(found);
            setError(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchViolation();
  }, [id]);

  const formatPlate = (plate) => {
    return plate;
  };

  const getViolationIcon = (type) => {
    if (!type) return <FaExclamationTriangle />;
    if (type.includes("Speed")) return "🚀";
    if (type.includes("Red Light")) return "🚦";
    if (type.includes("Wrong")) return "↔️";
    return "⚠️";
  };

  const getViolationClass = (type) => {
    if (!type) return "";
    if (type.includes("Speed")) return "speeding";
    if (type.includes("Red Light")) return "red-light";
    if (type.includes("Wrong")) return "wrong-lane";
    return "";
  };

  if (loading) {
    return (
      <div className="violation-detail-page">
        <div className="violation-detail">
          <div className="loading-container">
            <p>Loading violation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !violation) {
    return (
      <div className="violation-detail-page">
        <div className="violation-detail">
          <div className="error-container">
            <p>{error || "Violation not found"}</p>
            <button
              className="back-button"
              onClick={() => navigate("/violations")}
            >
              <FaArrowLeft /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="violation-detail-page">
      <div className="violation-detail">
        <div className="violation-detail-header">
          <button
            className="back-button"
            onClick={() => navigate("/violations")}
          >
            <FaArrowLeft /> Back to List
          </button>
          <h1 className={getViolationClass(violation.type)}>
            <span className="violation-icon">
              {getViolationIcon(violation.type)}
            </span>
            {violation.type}
          </h1>
          <div
            className="status-tag"
            data-status={violation.status.toLowerCase()}
          >
            {violation.status}
          </div>
        </div>

        <div className="violation-detail-content">
          <div className="violation-main-content">
            <div className="violation-image-large">
              <img
                src={violation.evidence || "https://placehold.co/1400x800"}
                alt={`Violation by ${violation.plate}`}
              />
            </div>

            <div className="license-plate-showcase">
              <div className="license-plate-container">
                <img
                  src={
                    violation.lp ||
                    "https://placehold.co/400x150?text=No+Plate+Image"
                  }
                  alt={`License plate ${violation.plate}`}
                  className="license-plate-image"
                />
              </div>
              <div className="plate-info">
                <span className="plate-title">License Plate</span>
                <span className="plate-number">
                  {formatPlate(violation.plate)}
                </span>
              </div>
            </div>
          </div>

          <div className="violation-info">
            <div className="info-card">
              <h2>
                <FaInfoCircle /> Violation Details
              </h2>

              <div className="info-row">
                <span className="info-label">License Plate:</span>
                <span className="info-value">
                  {formatPlate(violation.plate)}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Vehicle Type:</span>
                <span className="info-value">
                  {violation.vehicle || "Unknown"}
                </span>
              </div>

              {/* <div className="info-row">
                <span className="info-label">Owner:</span>
                <span className="info-value">
                  {violation.owner || "Not registered"}
                </span>
              </div> */}

              <div className="info-row">
                <span className="info-label">ID:</span>
                <span className="info-value">{violation.id}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Date:</span>
                <span className="info-value">
                  {new Date(violation.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Location:</span>
                <span className="info-value">{violation.location}</span>
              </div>

              {violation.speed && (
                <div className="info-row">
                  <span className="info-label">Speed:</span>
                  <span className="info-value violation-detail-speed">
                    {violation.speed}
                  </span>
                </div>
              )}

              {violation.signalTime && (
                <div className="info-row">
                  <span className="info-label">Signal:</span>
                  <span className="info-value">{violation.signalTime}</span>
                </div>
              )}

              {violation.laneDetails && (
                <div className="info-row">
                  <span className="info-label">Lane Details:</span>
                  <span className="info-value">{violation.laneDetails}</span>
                </div>
              )}
            </div>

            <div className="action-buttons">
              <button className="resolve-button">
                <FaCheck /> Mark as Resolved
              </button>
              <button className="report-button">
                <FaExclamationTriangle /> Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
