import React from "react";
import "./ViolationLog.css";
import { useData } from "../contexts/DataProvider";
import { useNavigate } from "react-router-dom";
import { FaEye, FaSync } from "react-icons/fa";

export default function ViolationLog() {
  const { violations, isLoading, error, refreshViolations } = useData();
  const navigate = useNavigate();

  const formatPlate = (plate) => {
    return plate;
  };

  const getTypeClass = (type) => {
    if (!type) return "violation-type";
    if (type.includes("Speed")) return "violation-type speeding";
    if (type.includes("Red Light")) return "violation-type red-light";
    if (type.includes("Wrong")) return "violation-type wrong-lane";
    return "violation-type";
  };

  const handleViolationClick = (id) => {
    navigate(`/violations/${id}`);
  };

  const handleRefresh = () => {
    refreshViolations();
  };

  return (
    <aside className="violation-log">
      <div className="violation-header">
        <h2>Violation Log</h2>
        <button className="refresh-button" onClick={handleRefresh}>
          <FaSync /> Refresh
        </button>
      </div>
      {isLoading ? (
        <div className="loading-container">
          <p>Loading violations...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
        </div>
      ) : violations.length === 0 ? (
        <div className="no-violations">
          <p>No violations detected yet</p>
        </div>
      ) : (
        <div className="violation-list">
          {violations.map((violation) => (
            <div key={violation.id} className="violation-item">
              <div className="violation-image">
                <img
                  src={violation.evidence || "https://placehold.co/1400x800"}
                  alt={`Violation ${violation.id}`}
                />
              </div>
              <div className="violation-content">
                <div className="violation-date">
                  {new Date(violation.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="violation-details">
                  <h3 className={getTypeClass(violation.type)}>
                    {violation.type}
                  </h3>

                  <div className="violation-plate-container">
                    <div className="license-plate-thumbnail">
                      <img
                        src={
                          violation.lp ||
                          "https://placehold.co/400x150?text=No+Plate"
                        }
                        alt={`License plate ${violation.plate}`}
                      />
                    </div>
                    <p className="violation-plate">
                      {formatPlate(violation.plate)}
                    </p>
                  </div>

                  <p className="violation-location">{violation.location}</p>
                  {violation.speed && (
                    <p className="violation-speed">{violation.speed}</p>
                  )}
                </div>
                <button
                  className="violation-action-btn"
                  onClick={() => handleViolationClick(violation.id)}
                >
                  <FaEye /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
