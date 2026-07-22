import { createContext, useState, useContext, useEffect } from "react";
import { API_URL } from "../api";

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const [cameras, setCameras] = useState([
    { id: 1, name: "Camera 1", location: "Location 1", status: "active" },
    { id: 2, name: "Camera 2", location: "Location 2", status: "active" },
    { id: 3, name: "Camera 3", location: "Location 3", status: "active" },
    { id: 4, name: "Camera 4", location: "Location 4", status: "active" },
    { id: 5, name: "Camera 5", location: "Location 5", status: "active" },
    { id: 6, name: "Camera 6", location: "Location 6", status: "active" },
    { id: 7, name: "Camera 7", location: "Location 7", status: "active" },
  ]);

  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchViolations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/violations`);

      if (!response.ok) {
        throw new Error(`Failed to fetch violations: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched violations:", data);
      setViolations(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching violations:", err);
      setError("Failed to load violation data. Please try again later.");
      // If server isn't responding, use demo data
      if (violations.length === 0) {
        setViolations([
          {
            id: "demo-1",
            plate: "car-001",
            type: "Speeding",
            status: "Pending",
            date: "2025-03-22",
            location: "Camera 1",
            speed: "80 km/h (Limit: 60 km/h)",
            evidence: "https://placehold.co/1400x800",
          },
          {
            id: "demo-2",
            plate: "bus-002",
            type: "Red Light Violation",
            status: "Pending",
            date: "2025-03-21",
            location: "Camera 2",
            signalTime: "Crossed at 3s after red",
            evidence: "https://placehold.co/1400x800",
          },
          {
            id: "demo-3",
            plate: "truck-003",
            type: "Wrong Lane Driving",
            status: "Pending",
            date: "2025-03-20",
            location: "Camera 1",
            laneDetails: "Entered wrong lane in turn",
            evidence: "https://placehold.co/1400x800",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchViolations();

    const intervalId = setInterval(fetchViolations, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <DataContext.Provider
      value={{
        cameras,
        setCameras,
        violations,
        setViolations,
        isLoading,
        error,
        refreshViolations: fetchViolations,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
