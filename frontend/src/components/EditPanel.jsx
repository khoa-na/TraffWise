import React, { useState, useEffect } from "react";
import "./EditPanel.css";

const getDefaultSettings = () => ({
  general_setting: {
    conf_threshold: 0.5,
    iou_threshold: 0.5,
    lane_annotate_enabled: true,
    road_annotate_enabled: true,
    intersection_annotate_enabled: true,
  },
  frame_skipper: {
    target_fps: 60,
    skip_rate: "auto",
  },
  speed_estimation: {
    enabled: true,
    over_speed_buffer: 1,
    roads: {
      intersection: { speed_limit: 30 },
      road_1: {
        lane_1: { speed_limit: 50 },
        lane_2: { speed_limit: 50 },
      },
    },
  },
  red_light_violation: {
    enabled: true,
  },
  wrong_way_violation: {
    enabled: true,
    angle_threshold: 10,
    straight_threshold: 10,
    dot_threshold: 0.5,
    tolerance_time: 3,
  },
});

const allCameraSettings = {};

const RoadSpeedSettings = ({ roadId, roadData, enabled, onSpeedChange }) => {
  console.log(roadId, roadData, enabled, onSpeedChange);
  return (
    <div className="speed-limit-section">
      <h4>
        {roadId === "intersection"
          ? "Intersection"
          : `Road ${roadId.split("_")[1]}`}
      </h4>
      {roadId === "intersection" ? (
        <div className="parameter-control">
          <label htmlFor={`${roadId}SpeedLimit`}>Speed Limit (km/h):</label>
          <input
            type="number"
            id={`${roadId}SpeedLimit`}
            min="10"
            max="120"
            step="5"
            value={roadData.speed_limit}
            onChange={(e) =>
              onSpeedChange(`${roadId}.speed_limit`, parseInt(e.target.value))
            }
            disabled={!enabled}
          />
        </div>
      ) : (
        Object.entries(roadData)
          .filter(([key]) => key.startsWith("lane_"))
          .map(([laneId, laneData]) => (
            <div className="parameter-control" key={laneId}>
              <label htmlFor={`${roadId}_${laneId}SpeedLimit`}>
                Lane {laneId.split("_")[1]} Speed Limit (km/h):
              </label>
              <input
                type="number"
                id={`${roadId}_${laneId}SpeedLimit`}
                min="10"
                max="120"
                step="5"
                value={laneData.speed_limit}
                onChange={(e) =>
                  onSpeedChange(
                    `${roadId}.${laneId}.speed_limit`,
                    parseInt(e.target.value)
                  )
                }
                disabled={!enabled}
              />
            </div>
          ))
      )}
    </div>
  );
};

export default function EditPanel({ cameraId }) {
  const [settings, setSettings] = useState(getDefaultSettings());
  const [isLoading, setIsLoading] = useState(false);

  console.log("EditPanel mounted with cameraId:", cameraId);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);

      if (allCameraSettings[cameraId]) {
        console.log(`Using cached settings for camera ${cameraId}`);
        setSettings(allCameraSettings[cameraId]);

        try {
          const response = await fetch(
            `http://localhost:8000/api/camera/${cameraId}/parameters`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cameraId: cameraId,
                settings: allCameraSettings[cameraId],
              }),
            }
          );
          if (!response.ok) {
            console.warn("Failed to sync settings with backend");
          }
        } catch (error) {
          console.error("Error syncing settings:", error);
        }

        setIsLoading(false);
        return;
      }

      const storedSettings = localStorage.getItem(
        `camera_${cameraId}_settings`
      );

      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);

        allCameraSettings[cameraId] = parsedSettings;

        const response = await fetch(
          `http://localhost:8000/api/camera/${cameraId}/parameters`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cameraId: cameraId,
              settings: parsedSettings,
            }),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to sync settings with backend");
        }
        setIsLoading(false);
      } else {
        try {
          const response = await fetch(
            `http://localhost:8000/api/camera/${cameraId}/config`
          );
          if (!response.ok) throw new Error("Failed to fetch config");
          const data = await response.json();
          if (data) {
            setSettings(data);

            localStorage.setItem(
              `camera_${cameraId}_settings`,
              JSON.stringify(data)
            );
            allCameraSettings[cameraId] = data;
          }

          console.log("Fetched settings for camera:", cameraId, data);
        } catch (error) {
          console.error("Error fetching config:", error);
          const defaultSettings = getDefaultSettings();
          setSettings(defaultSettings);

          localStorage.setItem(
            `camera_${cameraId}_settings`,
            JSON.stringify(defaultSettings)
          );
          allCameraSettings[cameraId] = defaultSettings;
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchConfig();
  }, [cameraId]);

  const setNestedValue = (obj, path, value) => {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
  };

  const handleInputChange = async (section, subsection, key, value) => {
    try {
      const newSettings = { ...settings };

      if (subsection) {
        newSettings[section][subsection][key] = value;
      } else {
        newSettings[section][key] = value;
      }

      setSettings(newSettings);

      localStorage.setItem(
        `camera_${cameraId}_settings`,
        JSON.stringify(newSettings)
      );
      allCameraSettings[cameraId] = newSettings;

      const response = await fetch(
        `http://localhost:8000/api/camera/${cameraId}/parameters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cameraId: cameraId,
            settings: newSettings,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update parameters");
      }

      const data = await response.json();
      if (data.config) {
        setSettings(data.config);

        localStorage.setItem(
          `camera_${cameraId}_settings`,
          JSON.stringify(data.config)
        );
        allCameraSettings[cameraId] = data.config;
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      // Try to recover from cached settings
      if (allCameraSettings[cameraId]) {
        setSettings(allCameraSettings[cameraId]);
      } else {
        const storedSettings = localStorage.getItem(
          `camera_${cameraId}_settings`
        );
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
      }
    }
  };

  const handleReset = async () => {
    try {
      localStorage.removeItem(`camera_${cameraId}_settings`);
      delete allCameraSettings[cameraId];

      const response = await fetch(
        `http://localhost:8000/api/camera/${cameraId}/config`
      );
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();

      setSettings(data);
      localStorage.setItem(`camera_${cameraId}_settings`, JSON.stringify(data));
      allCameraSettings[cameraId] = data;
    } catch (error) {
      console.error("Error resetting settings:", error);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {isLoading ? (
          <div className="loading">Loading configuration...</div>
        ) : (
          <>
            <h2 className="title">System Parameters</h2>

            {/* General Settings */}
            <section className="section">
              <h3 className="section-title">General Settings</h3>
              <div className="parameter-control">
                <label htmlFor="confidenceThreshold">
                  Detection Confidence:
                </label>
                <input
                  type="number"
                  id="confidenceThreshold"
                  name="confidence_threshold"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.general_setting.conf_threshold}
                  onChange={(e) =>
                    handleInputChange(
                      "general_setting",
                      null,
                      "conf_threshold",
                      parseFloat(e.target.value)
                    )
                  }
                />
              </div>

              <div className="parameter-control">
                <label htmlFor="iouThreshold">NMS IoU Threshold:</label>
                <input
                  type="number"
                  id="iouThreshold"
                  name="iou_threshold"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.general_setting.iou_threshold}
                  onChange={(e) =>
                    handleInputChange(
                      "general_setting",
                      null,
                      "iou_threshold",
                      parseFloat(e.target.value)
                    )
                  }
                />
              </div>

              <div className="section-header">
                <h3 className="section-title">Lane Annotation</h3>
                <div className="toggle-container">
                  <input
                    type="checkbox"
                    id="laneAnnotationEnabled"
                    name="lane_annotation_enabled"
                    checked={settings.general_setting.lane_annotate_enabled}
                    onChange={(e) =>
                      handleInputChange(
                        "general_setting",
                        null,
                        "lane_annotate_enabled",
                        e.target.checked
                      )
                    }
                  />
                  <label
                    className="toggle-label"
                    htmlFor="laneAnnotationEnabled"
                  >
                    {settings.general_setting.lane_annotate_enabled
                      ? "On"
                      : "Off"}
                  </label>
                </div>
              </div>

              <div className="section-header">
                <h3 className="section-title">Road Annotation</h3>
                <div className="toggle-container">
                  <input
                    type="checkbox"
                    id="roadAnnotationEnabled"
                    name="road_annotation_enabled"
                    checked={settings.general_setting.road_annotate_enabled}
                    onChange={(e) =>
                      handleInputChange(
                        "general_setting",
                        null,
                        "road_annotate_enabled",
                        e.target.checked
                      )
                    }
                  />
                  <label
                    className="toggle-label"
                    htmlFor="roadAnnotationEnabled"
                  >
                    {settings.general_setting.road_annotate_enabled
                      ? "On"
                      : "Off"}
                  </label>
                </div>
              </div>

              {settings.speed_estimation.roads.intersection && (
                <div className="section-header">
                  <h3 className="section-title">Intersection Annotation</h3>
                  <div className="toggle-container">
                    <input
                      type="checkbox"
                      id="intersectionAnnotationEnabled"
                      name="intersection_annotate_enabled"
                      checked={
                        settings.general_setting.intersection_annotate_enabled
                      }
                      onChange={(e) =>
                        handleInputChange(
                          "general_setting",
                          null,
                          "intersection_annotate_enabled",
                          e.target.checked
                        )
                      }
                    />
                    <label
                      className="toggle-label"
                      htmlFor="intersectionAnnotationEnabled"
                    >
                      {settings.general_setting.intersection_annotate_enabled
                        ? "On"
                        : "Off"}
                    </label>
                  </div>
                </div>
              )}
            </section>

            <section className="section">
              <h3 className="section-title">Frame Skipper</h3>
              <div className="parameter-control">
                <label htmlFor="targetFPS">Target FPS</label>
                <input
                  type="number"
                  id="targetFPS"
                  name="target_fps"
                  min="10"
                  max="60"
                  step="5"
                  value={settings.frame_skipper.target_fps}
                  onChange={(e) =>
                    handleInputChange(
                      "frame_skipper",
                      null,
                      "target_fps",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>

              <div className="parameter-control">
                <label htmlFor="skipRate">Skip Rate</label>
                <input
                  type="text"
                  id="skipRate"
                  name="skip_rate"
                  value={settings.frame_skipper.skip_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "auto" ||
                      value === "" ||
                      (!isNaN(parseInt(value)) &&
                        parseInt(value) >= 1 &&
                        parseInt(value) <= 10)
                    ) {
                      handleInputChange(
                        "frame_skipper",
                        null,
                        "skip_rate",
                        value
                      );
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (
                      value !== "auto" &&
                      (value === "" ||
                        isNaN(parseInt(value)) ||
                        parseInt(value) < 1 ||
                        parseInt(value) > 10)
                    ) {
                      handleInputChange(
                        "frame_skipper",
                        null,
                        "skip_rate",
                        "auto"
                      );
                    }
                  }}
                  className="text-input"
                />
                <small
                  style={{
                    color: "#a0a0a0",
                    marginTop: "4px",
                    fontSize: "0.8rem",
                  }}
                >
                  Enter "auto" or a number from 1-10
                </small>
              </div>
            </section>

            {/* Speed Estimation Settings */}
            <section className="section">
              <div className="section-header">
                <h3 className="section-title">Speed Estimation</h3>
                <div className="toggle-container">
                  <input
                    type="checkbox"
                    id="speedEstimationEnabled"
                    name="enabled"
                    checked={settings.speed_estimation.enabled}
                    onChange={(e) =>
                      handleInputChange(
                        "speed_estimation",
                        null,
                        "enabled",
                        e.target.checked
                      )
                    }
                  />
                  <label
                    className="toggle-label"
                    htmlFor="speedEstimationEnabled"
                  >
                    {settings.speed_estimation.enabled ? "On" : "Off"}
                  </label>
                </div>
              </div>

              <div
                className={`section-content ${
                  !settings.speed_estimation.enabled ? "disabled" : ""
                }`}
              >
                <div className="parameter-control">
                  <label htmlFor="overspeedBuffer">
                    Overspeed Buffer (km/h):
                  </label>
                  <input
                    type="number"
                    id="overspeedBuffer"
                    name="over_speed_buffer"
                    min="0"
                    max="20"
                    step="1"
                    value={settings.speed_estimation.over_speed_buffer}
                    onChange={(e) =>
                      handleInputChange(
                        "speed_estimation",
                        null,
                        "over_speed_buffer",
                        parseInt(e.target.value)
                      )
                    }
                    disabled={!settings.speed_estimation.enabled}
                  />
                </div>

                {/* Dynamic Road Speed Settings */}
                {Object.entries(settings.speed_estimation.roads).map(
                  ([roadId, roadData]) => (
                    <RoadSpeedSettings
                      key={`${cameraId}_${roadId}`}
                      roadId={roadId}
                      roadData={roadData}
                      enabled={settings.speed_estimation.enabled}
                      onSpeedChange={(path, value) => {
                        const newSettings = { ...settings };
                        setNestedValue(
                          newSettings.speed_estimation.roads,
                          path,
                          value
                        );
                        setSettings(newSettings);
                        // Send to backend
                        fetch(
                          `http://localhost:8000/api/camera/${cameraId}/parameters`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              cameraId: cameraId,
                              settings: newSettings,
                            }),
                          }
                        );
                      }}
                    />
                  )
                )}
              </div>
            </section>

            {/* Red Light Violation Settings */}
            <section className="section">
              <div className="section-header">
                <h3 className="section-title">Red Light Violation Detection</h3>
                <div className="toggle-container">
                  <input
                    type="checkbox"
                    id="redLightDetectionEnabled"
                    name="enabled"
                    checked={settings.red_light_violation.enabled}
                    onChange={(e) =>
                      handleInputChange(
                        "red_light_violation",
                        null,
                        "enabled",
                        e.target.checked
                      )
                    }
                  />
                  <label
                    className="toggle-label"
                    htmlFor="redLightDetectionEnabled"
                  >
                    {settings.red_light_violation.enabled ? "On" : "Off"}
                  </label>
                </div>
              </div>
            </section>

            {/* Wrong Way Violation Settings */}
            <section className="section">
              <div className="section-header">
                <h3 className="section-title">Wrong Way Violation Detection</h3>
                <div className="toggle-container">
                  <input
                    type="checkbox"
                    id="wrongWayDetectionEnabled"
                    name="enabled"
                    checked={settings.wrong_way_violation.enabled}
                    onChange={(e) =>
                      handleInputChange(
                        "wrong_way_violation",
                        null,
                        "enabled",
                        e.target.checked
                      )
                    }
                  />
                  <label
                    className="toggle-label"
                    htmlFor="wrongWayDetectionEnabled"
                  >
                    {settings.wrong_way_violation.enabled ? "On" : "Off"}
                  </label>
                </div>
              </div>

              <div
                className={`section-content ${
                  !settings.wrong_way_violation.enabled ? "disabled" : ""
                }`}
              >
                <div className="parameter-control">
                  <label htmlFor="angleThreshold">
                    Angle Threshold (degrees):
                  </label>
                  <input
                    type="number"
                    id="angleThreshold"
                    name="angle_threshold"
                    min="0"
                    max="180"
                    step="5"
                    value={settings.wrong_way_violation.angle_threshold}
                    onChange={(e) =>
                      handleInputChange(
                        "wrong_way_violation",
                        null,
                        "angle_threshold",
                        parseInt(e.target.value)
                      )
                    }
                    disabled={!settings.wrong_way_violation.enabled}
                  />
                </div>

                <div className="parameter-control">
                  <label htmlFor="straightThreshold">
                    Straight Threshold (degrees):
                  </label>
                  <input
                    type="number"
                    id="straightThreshold"
                    name="straight_threshold"
                    min="0"
                    max="90"
                    step="5"
                    value={settings.wrong_way_violation.straight_threshold}
                    onChange={(e) =>
                      handleInputChange(
                        "wrong_way_violation",
                        null,
                        "straight_threshold",
                        parseInt(e.target.value)
                      )
                    }
                    disabled={!settings.wrong_way_violation.enabled}
                  />
                </div>

                <div className="parameter-control">
                  <label htmlFor="dotThreshold">Direction Dot Threshold:</label>
                  <input
                    type="number"
                    id="dotThreshold"
                    name="dot_threshold"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={settings.wrong_way_violation.dot_threshold}
                    onChange={(e) =>
                      handleInputChange(
                        "wrong_way_violation",
                        null,
                        "dot_threshold",
                        parseFloat(e.target.value)
                      )
                    }
                    disabled={!settings.wrong_way_violation.enabled}
                  />
                </div>

                <div className="parameter-control">
                  <label htmlFor="toleranceTime">
                    Tolerance Time (seconds):
                  </label>
                  <input
                    type="number"
                    id="toleranceTime"
                    name="tolerance_time"
                    min="0"
                    max="10"
                    step="0.5"
                    value={settings.wrong_way_violation.tolerance_time}
                    onChange={(e) =>
                      handleInputChange(
                        "wrong_way_violation",
                        null,
                        "tolerance_time",
                        parseFloat(e.target.value)
                      )
                    }
                    disabled={!settings.wrong_way_violation.enabled}
                  />
                </div>
              </div>
            </section>

            {/* Reset Button */}
            <div className="action-buttons">
              <button className="reset-button" onClick={handleReset}>
                Reset to Defaults
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
