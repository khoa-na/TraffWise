import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaFilePdf,
  FaFileExcel,
  FaFilter,
  FaEye,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./ViolationPage.css";
import Header from "../components/Header";
import { useData } from "../contexts/DataProvider";

export default function ViolationPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState({ type: "", status: "" });
  const { violations } = useData();

  const filteredViolations = violations.filter(
    (v) =>
      v.plate.includes(searchQuery) &&
      (filter.type === "" || v.type === filter.type) &&
      (filter.status === "" || v.status === filter.status)
  );

  const handleReview = (id) => {
    navigate(`/violations/${id}`);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Traffic Violations Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let filterText = "Filters applied: ";
    if (searchQuery) filterText += `Plate containing "${searchQuery}" `;
    if (filter.type) filterText += `Type: ${filter.type} `;
    if (filter.status) filterText += `Status: ${filter.status} `;
    if (filterText === "Filters applied: ") filterText += "None";
    doc.text(filterText, 14, 38);

    autoTable(doc, {
      head: [["Date", "Plate", "Type", "Status", "Location"]],
      body: filteredViolations.map((v) => [
        v.date,
        v.plate,
        v.type,
        v.status,
        v.location,
      ]),
      startY: 45,
      theme: "grid",
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save("traffic_violations_report.pdf");
  };

  // Generate Excel report
  const generateExcelReport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredViolations.map((v) => ({
        Date: v.date,
        Plate: v.plate,
        Type: v.type,
        Status: v.status,
        Location: v.location,
      }))
    );

    // Set column widths
    const wscols = [
      { wch: 15 }, // Date
      { wch: 12 }, // Plate
      { wch: 20 }, // Type
      { wch: 12 }, // Status
      { wch: 30 }, // Location
    ];
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Violations");
    XLSX.writeFile(workbook, "traffic_violations_report.xlsx");
  };

  return (
    <>
      <Header />
      <div className="violation-container">
        <div className="violation-header">
          <h2>Violation List</h2>
          <div className="search-bar">
            <FaSearch className="icon" />
            <input
              type="text"
              placeholder="Search by plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-panel">
          <FaFilter className="icon" />
          <select
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="Speeding">Speeding</option>
            <option value="Red Light Violation">Red Light Violation</option>
            <option value="Wrong Lane Driving">Wrong Lane Driving</option>
          </select>
          <select
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <table className="violation-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Plate</th>
              <th>Type</th>
              <th>Status</th>
              <th>Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredViolations.map((v) => (
              <tr key={v.id}>
                <td>{v.date}</td>
                <td>{v.plate}</td>
                <td>{v.type}</td>
                <td>{v.status}</td>
                <td>{v.location}</td>
                <td>
                  <button
                    className="review-btn"
                    onClick={() => handleReview(v.id)}
                  >
                    <FaEye /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="report-generation">
          <h3>Generate Report</h3>
          <button className="report-btn pdf" onClick={generatePDFReport}>
            <FaFilePdf /> PDF
          </button>
          <button className="report-btn excel" onClick={generateExcelReport}>
            <FaFileExcel /> Excel
          </button>
        </div>
      </div>
    </>
  );
}
